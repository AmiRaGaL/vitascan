import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { GroqService } from './groq.service';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { RedFlagsService } from './red-flags.service';
import type {
  BodyArea,
  SymptomCategory,
  SymptomQuestion,
  StructuredSymptomRequest,
} from '@vitascan/shared';

const SYMPTOM_LIMITS = {
  guest: 3,
  free: 5,
  premium: 50,
} as const;

const guestUsageByIp = new Map<string, { date: string; count: number }>();

@Controller('symptom-sessions')
export class SymptomController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly groq: GroqService,
    private readonly redFlags: RedFlagsService,
  ) {}

  @Get('body-areas')
  async getBodyAreas(): Promise<BodyArea[]> {
    const { data, error } = await this.supabase.supabase
      .from('body_areas')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    return data;
  }

  @Get('symptom-categories/:bodyAreaId')
  async getSymptomCategories(
    @Param('bodyAreaId') bodyAreaId: string,
  ): Promise<SymptomCategory[]> {
    const { data, error } = await this.supabase.supabase
      .from('symptom_categories')
      .select('*')
      .eq('body_area_id', bodyAreaId)
      .order('sort_order', { ascending: true });
    if (error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    return data;
  }

  @Get('symptom-questions/:categoryId')
  async getQuestions(
    @Param('categoryId') categoryId: string,
  ): Promise<SymptomQuestion[]> {
    const { data, error } = await this.supabase.supabase
      .from('symptom_questions')
      .select('*')
      .eq('symptom_category_id', categoryId)
      .order('sort_order', { ascending: true });
    if (error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    return data;
  }

  // Get user history
  @Get()
  @UseGuards(OptionalAuthGuard)
  async getUserSessions(@Req() req: any) {
    if (!req.user?.id)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const { data, error } = await this.supabase.supabase
      .from('symptom_sessions')
      .select(
        'id, initial_input, triage_level, specialty_suggestion, red_flags_detected, created_at',
      )
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    return data;
  }

  // Get single session
  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async getSessionById(@Param('id') id: string, @Req() req: any) {
    if (!req.user?.id)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const { data, error } = await this.supabase.supabase
      .from('symptom_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    if (!data)
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);

    return data;
  }

  @Post('analyze')
  @UseGuards(OptionalAuthGuard)
  async analyzeSymptoms(
    @Body() body: StructuredSymptomRequest,
    @Req() req: any,
  ) {
    const validationError = this.validateAnalyzePayload(body);
    if (validationError)
      throw new HttpException(validationError, HttpStatus.BAD_REQUEST);

    await this.enforceSymptomLimit(req);

    // 1. Get AI response
    let triageResult = await this.groq.analyzeStructuredSymptoms(body);

    // 2. Apply Rule-Based Overrides
    const flagEvaluation = this.redFlags.evaluate(body);
    if (flagEvaluation.hasRedFlags) {
      triageResult = { ...triageResult, ...flagEvaluation.overrides } as any;
    }

    // 3. Save to DB
    const { data, error } = await this.supabase.supabase
      .from('symptom_sessions')
      .insert({
        user_id: req.user?.id ?? null,
        body_area_id: body.body_area_id,
        symptom_category_id: body.symptom_category_id,
        user_answers: body.answers,
        health_profile_snapshot: body.health_profile,
        status: 'completed',
        triage_level: triageResult.triageLevel,
        specialty_suggestion: triageResult.specialtySuggestion,
        llm_confidence: triageResult.confidence,
        red_flags_detected:
          flagEvaluation.hasRedFlags || triageResult.redFlags.length > 0,
        initial_input: `${body.body_area_name}: ${body.symptom_name}`,
        summary: triageResult.homeCareAdvice,
      })
      .select('id')
      .single();

    if (error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);

    if (req.user?.id) {
      const { error: usageError } = await this.supabase.supabase.rpc(
        'increment_symptom_usage',
        {
          p_user_id: req.user.id,
          p_date: new Date().toISOString().slice(0, 10),
        },
      );

      if (usageError)
        throw new HttpException(
          usageError.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }

    return { sessionId: data.id, triage: triageResult };
  }

  private async enforceSymptomLimit(req: any) {
    const today = new Date().toISOString().slice(0, 10);

    if (!req.user?.id) {
      const ip = this.getClientIp(req);
      const current = guestUsageByIp.get(ip);
      const count = current?.date === today ? current.count : 0;

      if (count >= SYMPTOM_LIMITS.guest) {
        throw new HttpException(
          `Daily symptom check limit reached (${SYMPTOM_LIMITS.guest}/day for guests). Sign in for a higher limit.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      guestUsageByIp.set(ip, { date: today, count: count + 1 });
      return;
    }

    const { data: user, error: userError } = await this.supabase.supabase
      .from('users')
      .select('tier')
      .eq('id', req.user.id)
      .maybeSingle<{ tier: 'free' | 'premium' | null }>();

    if (userError)
      throw new HttpException(
        userError.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    const tier = user?.tier === 'premium' ? 'premium' : 'free';
    const limit = SYMPTOM_LIMITS[tier];
    const { data, error } = await this.supabase.supabase
      .from('usage_counters')
      .select('symptom_checks_used')
      .eq('user_id', req.user.id)
      .eq('date', today)
      .maybeSingle<{ symptom_checks_used: number }>();

    if (error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);

    if ((data?.symptom_checks_used ?? 0) >= limit) {
      throw new HttpException(
        `Daily symptom check limit reached (${limit}/day).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private getClientIp(req: any): string {
    const forwardedFor = req.headers?.['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  private validateAnalyzePayload(
    body: StructuredSymptomRequest,
  ): string | null {
    if (!body || typeof body !== 'object') return 'Symptom payload is required';
    if (!body.body_area_id || typeof body.body_area_id !== 'string')
      return 'body_area_id is required';
    if (
      !body.symptom_category_id ||
      typeof body.symptom_category_id !== 'string'
    )
      return 'symptom_category_id is required';
    if (!body.body_area_name || typeof body.body_area_name !== 'string')
      return 'body_area_name is required';
    if (!body.symptom_name || typeof body.symptom_name !== 'string')
      return 'symptom_name is required';
    if (!Array.isArray(body.answers)) return 'answers must be an array';

    const invalidAnswer = body.answers.some(
      (answer) =>
        !answer ||
        typeof answer.question_id !== 'string' ||
        typeof answer.question_text !== 'string' ||
        !(
          typeof answer.answer === 'string' ||
          (Array.isArray(answer.answer) &&
            answer.answer.every((item) => typeof item === 'string'))
        ),
    );

    if (invalidAnswer)
      return 'answers must include question_id, question_text, and answer';

    return null;
  }
}

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
    if (!req.user.id)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const { data, error } = await this.supabase.supabase
      .from('symptom_sessions')
      .select('id, initial_input, triage_level, created_at')
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
    const { data, error } = await this.supabase.supabase
      .from('symptom_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    if (data.user_id && data.user_id !== req.user.id)
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    return data;
  }

  @Post('analyze')
  async analyzeSymptoms(@Body() body: StructuredSymptomRequest) {
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

    return { sessionId: data.id, triage: triageResult };
  }
}

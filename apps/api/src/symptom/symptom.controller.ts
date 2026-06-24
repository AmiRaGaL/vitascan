import {
  Controller,
  Delete,
  Post,
  Body,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  AnalyzeSymptomsRequestDto,
  AnalyzeSymptomsResponseDto,
} from '../docs/swagger.dto';
import { SupabaseService } from '../supabase/supabase.service';
import { GroqService } from './groq.service';
import { AiServiceClient, AiTriageResponse } from './ai-service.client';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { RedFlagsService } from './red-flags.service';
import {
  KnowledgeBaseChunk,
  KnowledgeBaseService,
} from '../kb/knowledge-base.service';
import { RateLimitService } from '../security/rate-limit.service';
import type {
  BodyArea,
  SymptomCategory,
  SymptomQuestion,
  StructuredSymptomRequest,
  TriageResult,
} from '@vitascan/shared';

const SYMPTOM_LIMITS = {
  guest: 3,
  free: 5,
  premium: 50,
} as const;

const guestUsageByIp = new Map<string, { date: string; count: number }>();

@ApiTags('symptom')
@ApiBearerAuth()
@Controller('symptom-sessions')
export class SymptomController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly groq: GroqService,
    private readonly aiService: AiServiceClient,
    private readonly redFlags: RedFlagsService,
    private readonly knowledgeBase: KnowledgeBaseService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Get('body-areas')
  @ApiOperation({ summary: 'List symptom-check body areas' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 'body-area-chest',
          name: 'Chest',
          icon: 'chest',
          description: 'Chest, breathing, or heart-related symptoms',
          sort_order: 1,
        },
      ],
    },
  })
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
  @ApiOperation({ summary: 'List symptom categories for a body area' })
  @ApiParam({ name: 'bodyAreaId', example: 'body-area-chest' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 'symptom-chest-pain',
          body_area_id: 'body-area-chest',
          name: 'Chest pain',
          description: 'Pain, pressure, tightness, or discomfort in the chest',
          sort_order: 1,
        },
      ],
    },
  })
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
  @ApiOperation({ summary: 'List guided questions for a symptom category' })
  @ApiParam({ name: 'categoryId', example: 'symptom-chest-pain' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 'severity',
          symptom_category_id: 'symptom-chest-pain',
          question_text: 'How severe is it?',
          question_type: 'single_choice',
          options: ['Mild', 'Moderate', 'Severe'],
          is_required: true,
          sort_order: 1,
        },
      ],
    },
  })
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
  @ApiOperation({ summary: 'List saved symptom sessions for the user' })
  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            id: 'session-id',
            initial_input: 'Chest: Chest tightness',
            triage_level: 'pcp',
            specialty_suggestion: null,
            red_flags_detected: false,
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    },
  })
  async getUserSessions(
    @Req() req: any,
    @Query('page') pageQuery?: string,
    @Query('limit') limitQuery?: string,
  ) {
    if (!req.user?.id)
      throw new HttpException(
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );

    const page = this.parsePositiveInt(pageQuery, 1);
    const limit = Math.min(this.parsePositiveInt(limitQuery, 10), 50);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await this.supabase.supabase
      .from('symptom_sessions')
      .select(
        'id, initial_input, triage_level, specialty_suggestion, red_flags_detected, created_at',
        { count: 'exact' },
      )
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);

    const total = count ?? 0;
    return {
      data: data ?? [],
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  // Get single session
  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get one saved symptom session' })
  @ApiParam({ name: 'id', example: 'session-id' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 'session-id',
        initial_input: 'Chest: Chest tightness',
        triage_level: 'pcp',
        summary: 'Monitor symptoms and follow up if they persist.',
        red_flags_detected: false,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    },
  })
  async getSessionById(@Param('id') id: string, @Req() req: any) {
    if (!req.user?.id)
      throw new HttpException(
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );

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

  @Delete(':id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Delete one saved symptom session' })
  @ApiParam({ name: 'id', example: 'session-id' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  async deleteSession(@Param('id') id: string, @Req() req: any) {
    if (!req.user?.id)
      throw new HttpException(
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );

    const { data: session, error: sessionError } = await this.supabase.supabase
      .from('symptom_sessions')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (sessionError)
      throw new HttpException(
        sessionError.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    if (!session)
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);

    const { error } = await this.supabase.supabase
      .from('symptom_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);

    return { success: true };
  }

  @Post('analyze')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Analyze structured symptom answers and optionally save a session',
  })
  @ApiBody({ type: AnalyzeSymptomsRequestDto })
  @ApiOkResponse({ type: AnalyzeSymptomsResponseDto })
  async analyzeSymptoms(
    @Body() body: StructuredSymptomRequest,
    @Req() req: any,
  ) {
    const validationError = this.validateAnalyzePayload(body);
    if (validationError)
      throw new HttpException(validationError, HttpStatus.BAD_REQUEST);

    this.rateLimit.enforce(
      'symptom:analyze',
      req.user?.id ?? this.getClientIp(req),
      {
        limit: 12,
        windowMs: 60_000,
      },
    );

    await this.enforceSymptomLimit(req);

    const referenceChunks = await this.knowledgeBase.retrieveRelevantChunks(
      this.buildSymptomKbQuery(body),
      5,
    );
    const ragReferences = this.formatReferenceSummary(referenceChunks);

    // 1. Get AI response
    let triageResult = await this.analyzeWithConfiguredProvider(
      body,
      referenceChunks,
      req,
    );

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
        rag_references: ragReferences,
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

    return {
      sessionId: data.id,
      triage: triageResult,
      references: ragReferences,
    };
  }

  private buildSymptomKbQuery(body: StructuredSymptomRequest): string {
    const answersText = body.answers
      .map((answer) => {
        const value = Array.isArray(answer.answer)
          ? answer.answer.join(', ')
          : answer.answer;
        return `${answer.question_text}: ${value}`;
      })
      .join('\n');

    const age = body.health_profile?.age;
    const sex = body.health_profile?.sex_at_birth;
    const combinedText = [body.body_area_name, body.symptom_name, answersText]
      .join(' ')
      .toLowerCase();
    const redFlagTerms = this.extractRedFlagTerms(combinedText);

    return [
      `Body area: ${body.body_area_name}`,
      `Symptom: ${body.symptom_name}`,
      `Answers: ${answersText || 'None'}`,
      `Age: ${age ?? 'Not provided'}`,
      `Sex assigned at birth: ${sex ?? 'Not provided'}`,
      `Red-flag terms: ${redFlagTerms.join(', ') || 'None detected in query text'}`,
    ].join('\n');
  }

  private async analyzeWithConfiguredProvider(
    body: StructuredSymptomRequest,
    referenceChunks: KnowledgeBaseChunk[],
    req: any,
  ): Promise<TriageResult> {
    if (process.env.USE_AI_SERVICE === 'true') {
      const aiResponse = await this.aiService.runTriage({
        user_id: req.user?.id ?? null,
        session_id: body.symptom_category_id,
        message: this.buildAiServiceMessage(body),
        health_profile: {
          age: body.health_profile?.age ?? null,
          sex: body.health_profile?.sex_at_birth ?? null,
          conditions: body.health_profile?.chronic_conditions ?? [],
          medications: body.health_profile?.medications ?? [],
          allergies: body.health_profile?.allergies ?? [],
        },
      });

      return this.mapAiServiceResponse(aiResponse);
    }

    return this.groq.analyzeStructuredSymptoms(body, referenceChunks);
  }

  private buildAiServiceMessage(body: StructuredSymptomRequest): string {
    const answers = body.answers
      .map((answer) => {
        const value = Array.isArray(answer.answer)
          ? answer.answer.join(', ')
          : answer.answer;
        return `${answer.question_text}: ${value}`;
      })
      .join('\n');

    return [
      `${body.body_area_name}: ${body.symptom_name}`,
      answers || 'No additional symptom details provided',
    ].join('\n');
  }

  private mapAiServiceResponse(response: AiTriageResponse): TriageResult {
    return {
      triageLevel:
        response.triage_level === 'primary_care'
          ? 'pcp'
          : (response.triage_level as TriageResult['triageLevel']),
      specialtySuggestion: null,
      possibleIssueCategories: [],
      redFlags: response.safety_override_applied ? ['Safety override'] : [],
      confidence: Math.round(response.confidence * 100),
      homeCareAdvice: response.response,
      doctorVisitPreparationTips:
        response.follow_up_questions.length > 0
          ? response.follow_up_questions.join(' ')
          : 'Track your symptoms and share changes with a healthcare professional.',
    };
  }

  private extractRedFlagTerms(text: string): string[] {
    const terms = [
      'chest pain',
      'shortness of breath',
      'trouble breathing',
      'fainting',
      'confusion',
      'weakness',
      'numbness',
      'speech trouble',
      'severe pain',
      'sudden',
      'blood',
      'stiff neck',
      'swelling',
      'blue lips',
      'dehydration',
      'pregnancy',
      'major trauma',
    ];

    return terms.filter((term) => text.includes(term));
  }

  private formatReferenceSummary(chunks: KnowledgeBaseChunk[]) {
    return chunks.map((chunk) => ({
      title: chunk.title,
      source: chunk.source,
      metadata: chunk.metadata,
    }));
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

  private parsePositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return fallback;
    return parsed;
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

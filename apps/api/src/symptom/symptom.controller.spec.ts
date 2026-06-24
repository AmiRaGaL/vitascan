import { SymptomController } from './symptom.controller';
import type { StructuredSymptomRequest, TriageResult } from '@vitascan/shared';

describe('SymptomController payload validation', () => {
  const controller = new SymptomController(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  const validateAnalyzePayload = (body: unknown) =>
    (controller as any).validateAnalyzePayload(body);

  const validPayload = {
    body_area_id: 'body-area-id',
    body_area_name: 'Chest',
    symptom_category_id: 'symptom-id',
    symptom_name: 'Chest pain',
    answers: [
      {
        question_id: 'question-id',
        question_text: 'How severe is it?',
        answer: 'Moderate',
      },
    ],
  };

  it('accepts a valid structured symptom payload', () => {
    expect(validateAnalyzePayload(validPayload)).toBeNull();
  });

  it('requires body_area_id', () => {
    expect(validateAnalyzePayload({ ...validPayload, body_area_id: '' })).toBe(
      'body_area_id is required',
    );
  });

  it('requires answers to be an array', () => {
    expect(validateAnalyzePayload({ ...validPayload, answers: null })).toBe(
      'answers must be an array',
    );
  });

  it('rejects malformed answers', () => {
    expect(
      validateAnalyzePayload({
        ...validPayload,
        answers: [{ question_id: 'question-id', answer: 5 }],
      }),
    ).toBe('answers must include question_id, question_text, and answer');
  });
});

describe('SymptomController analyzeSymptoms', () => {
  const validPayload: StructuredSymptomRequest = {
    body_area_id: 'body-area-id',
    body_area_name: 'Chest',
    symptom_category_id: 'symptom-id',
    symptom_name: 'Chest tightness',
    answers: [
      {
        question_id: 'severity',
        question_text: 'How severe is it?',
        answer: 'Mild',
      },
    ],
  };

  const triageResult: TriageResult = {
    triageLevel: 'pcp',
    specialtySuggestion: null,
    possibleIssueCategories: ['General'],
    redFlags: [],
    confidence: 72,
    homeCareAdvice: 'Monitor symptoms and follow up if they persist.',
    doctorVisitPreparationTips: 'Track timing and triggers.',
  };

  function selectMaybeSingle(result: unknown) {
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue(result),
    };
  }

  function insertSessionQuery(sessionId = 'session-id') {
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: { id: sessionId }, error: null }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: sessionId }, error: null }),
        }),
      }),
    };
  }

  function createController(options?: {
    userTier?: 'free' | 'premium' | null;
    symptomChecksUsed?: number | null;
    redFlagEvaluation?: ReturnType<any>;
  }) {
    const sessionQuery = insertSessionQuery();
    const usersQuery = selectMaybeSingle({
      data: { tier: options?.userTier ?? 'free' },
      error: null,
    });
    const usageQuery = selectMaybeSingle({
      data:
        options?.symptomChecksUsed === null
          ? null
          : { symptom_checks_used: options?.symptomChecksUsed ?? 0 },
      error: null,
    });

    const supabase = {
      supabase: {
        from: jest.fn((table: string) => {
          if (table === 'users') return usersQuery;
          if (table === 'usage_counters') return usageQuery;
          if (table === 'symptom_sessions') return sessionQuery;
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc: jest.fn().mockResolvedValue({ error: null }),
      },
    };
    const groq = {
      analyzeStructuredSymptoms: jest.fn().mockResolvedValue(triageResult),
    };
    const aiService = {
      runTriage: jest.fn().mockResolvedValue({
        triage_level: 'primary_care',
        confidence: 0.5,
        response: 'Mock triage response...',
        citations: [],
        follow_up_questions: [],
        safety_override_applied: false,
        trace_id: 'mock_trace_symptom-id',
      }),
      getTraces: jest.fn().mockResolvedValue([
        {
          trace_id: 'mock_trace_session-id',
          session_id: 'session-id',
          user_id: 'user-id',
          event_type: 'triage_run',
          payload: {},
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ]),
    };
    const redFlags = {
      evaluate: jest.fn().mockReturnValue(
        options?.redFlagEvaluation ?? {
          hasRedFlags: false,
          overrides: {},
        },
      ),
    };
    const knowledgeBase = {
      retrieveRelevantChunks: jest.fn().mockResolvedValue([
        {
          title: 'Trusted source',
          source: 'clinical-reference',
          metadata: { last_reviewed: '2026-01-01' },
          chunk_text: 'Educational reference text',
        },
      ]),
    };
    const rateLimit = {
      enforce: jest.fn(),
    };

    return {
      controller: new SymptomController(
        supabase as any,
        groq as any,
        aiService as any,
        redFlags as any,
        knowledgeBase as any,
        rateLimit as any,
      ),
      supabase,
      groq,
      aiService,
      redFlags,
      knowledgeBase,
      rateLimit,
      sessionQuery,
    };
  }

  it('returns saved session id, triage result, and reference summaries for a guest request', async () => {
    const { controller, groq, knowledgeBase, sessionQuery, supabase } =
      createController();

    await expect(
      controller.analyzeSymptoms(validPayload, {
        headers: { 'x-forwarded-for': '203.0.113.101' },
      }),
    ).resolves.toEqual({
      sessionId: 'session-id',
      triage: triageResult,
      references: [
        {
          title: 'Trusted source',
          source: 'clinical-reference',
          metadata: { last_reviewed: '2026-01-01' },
        },
      ],
    });

    expect(knowledgeBase.retrieveRelevantChunks).toHaveBeenCalledWith(
      expect.stringContaining('Symptom: Chest tightness'),
      5,
    );
    expect(groq.analyzeStructuredSymptoms).toHaveBeenCalledWith(
      validPayload,
      expect.any(Array),
    );
    expect(sessionQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: null,
        triage_level: 'pcp',
        rag_references: [
          {
            title: 'Trusted source',
            source: 'clinical-reference',
            metadata: { last_reviewed: '2026-01-01' },
          },
        ],
      }),
    );
    expect(supabase.supabase.rpc).not.toHaveBeenCalled();
  });

  it('blocks a fourth guest symptom check before calling KB, Groq, or Supabase insert', async () => {
    const { controller, groq, knowledgeBase, sessionQuery } =
      createController();
    const req = { headers: { 'x-forwarded-for': '203.0.113.102' } };

    await controller.analyzeSymptoms(validPayload, req);
    await controller.analyzeSymptoms(validPayload, req);
    await controller.analyzeSymptoms(validPayload, req);

    await expect(controller.analyzeSymptoms(validPayload, req)).rejects.toThrow(
      'Daily symptom check limit reached (3/day for guests). Sign in for a higher limit.',
    );
    expect(knowledgeBase.retrieveRelevantChunks).toHaveBeenCalledTimes(3);
    expect(groq.analyzeStructuredSymptoms).toHaveBeenCalledTimes(3);
    expect(sessionQuery.insert).toHaveBeenCalledTimes(3);
  });

  it('blocks a logged-in free user at the daily symptom limit before provider calls', async () => {
    const { controller, groq, knowledgeBase, sessionQuery } = createController({
      userTier: 'free',
      symptomChecksUsed: 5,
    });

    await expect(
      controller.analyzeSymptoms(validPayload, {
        user: { id: 'user-id' },
        headers: {},
      }),
    ).rejects.toThrow('Daily symptom check limit reached (5/day).');

    expect(knowledgeBase.retrieveRelevantChunks).not.toHaveBeenCalled();
    expect(groq.analyzeStructuredSymptoms).not.toHaveBeenCalled();
    expect(sessionQuery.insert).not.toHaveBeenCalled();
  });

  it('increments logged-in usage after a successful analysis', async () => {
    const { controller, supabase } = createController({
      userTier: 'premium',
      symptomChecksUsed: 49,
    });

    await controller.analyzeSymptoms(validPayload, {
      user: { id: 'user-id' },
      headers: {},
    });

    expect(supabase.supabase.rpc).toHaveBeenCalledWith(
      'increment_symptom_usage',
      expect.objectContaining({ p_user_id: 'user-id' }),
    );
  });

  it('applies red flag overrides to the structured triage response and saved row', async () => {
    const redFlagTriage = {
      triageLevel: 'emergency',
      redFlags: ['Sudden, severe pain'],
      homeCareAdvice: 'Seek emergency care now.',
      doctorVisitPreparationTips: 'Call emergency services.',
    };
    const { controller, sessionQuery } = createController({
      redFlagEvaluation: {
        hasRedFlags: true,
        overrides: redFlagTriage,
      },
    });

    const response = await controller.analyzeSymptoms(validPayload, {
      headers: { 'x-forwarded-for': '203.0.113.103' },
    });

    expect(response.triage).toMatchObject(redFlagTriage);
    expect(sessionQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        triage_level: 'emergency',
        red_flags_detected: true,
        summary: 'Seek emergency care now.',
      }),
    );
  });

  it('routes structured triage through the AI service when enabled', async () => {
    const previousFlag = process.env.USE_AI_SERVICE;
    process.env.USE_AI_SERVICE = 'true';
    const { controller, aiService, groq, sessionQuery } = createController();

    try {
      const response = await controller.analyzeSymptoms(validPayload, {
        user: { id: 'user-id' },
        headers: {},
      });

      expect(aiService.runTriage).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-id',
          session_id: 'symptom-id',
          message: expect.stringContaining('Chest: Chest tightness'),
        }),
      );
      expect(groq.analyzeStructuredSymptoms).not.toHaveBeenCalled();
      expect(response.triage).toMatchObject({
        triageLevel: 'pcp',
        confidence: 50,
        homeCareAdvice: 'Mock triage response...',
      });
      expect(sessionQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          triage_level: 'pcp',
          llm_confidence: 50,
        }),
      );
    } finally {
      if (previousFlag === undefined) {
        delete process.env.USE_AI_SERVICE;
      } else {
        process.env.USE_AI_SERVICE = previousFlag;
      }
    }
  });

  it('fetches traces only after confirming session ownership', async () => {
    const { controller, aiService, sessionQuery } = createController();

    await expect(
      controller.getSessionTraces('session-id', {
        user: { id: 'user-id' },
        headers: {},
      }),
    ).resolves.toEqual([
      {
        trace_id: 'mock_trace_session-id',
        session_id: 'session-id',
        user_id: 'user-id',
        event_type: 'triage_run',
        payload: {},
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    expect(sessionQuery.select).toHaveBeenCalledWith('id');
    expect(sessionQuery.eq).toHaveBeenCalledWith('id', 'session-id');
    expect(sessionQuery.eq).toHaveBeenCalledWith('user_id', 'user-id');
    expect(aiService.getTraces).toHaveBeenCalledWith('session-id');
  });
});

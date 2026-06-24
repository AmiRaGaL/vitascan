import { of } from 'rxjs';
import { AiMetricsService } from './ai-metrics.service';

describe('AiMetricsService', () => {
  function createService() {
    const supabase = {
      supabase: {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: [
              {
                payload: {
                  latency_ms: 100,
                  validation_passed: true,
                  fallback_used: false,
                  red_flags: { matched: true },
                  retrieved_chunks: [{ source: 'CDC' }, { source: 'Mayo' }],
                  triage_decision: {
                    triage_level: 'emergency',
                    safety_override_applied: true,
                  },
                },
              },
              {
                payload: {
                  latency_ms: 300,
                  validation_passed: false,
                  fallback_used: true,
                  red_flags: { matched: false },
                  retrieved_chunks: [],
                  triage_decision: { triage_level: 'primary_care' },
                },
              },
            ],
            error: null,
          }),
        }),
      },
    };
    const httpService = {
      get: jest.fn().mockReturnValue(
        of({
          data: {
            mode: 'mock',
            case_count: 2,
            metrics: { triage_accuracy: 0.5 },
            results: [
              {
                case_id: 'case-1',
                category: 'urgent_care',
                expected_triage_level: 'urgent_care',
                predicted_triage_level: 'primary_care',
                fallback_reason: null,
                message: 'raw text must not be returned',
              },
            ],
          },
        }),
      ),
    };

    return {
      service: new AiMetricsService(supabase as any, httpService as any),
      httpService,
    };
  }

  it('returns aggregated metrics without raw eval text', async () => {
    process.env.AI_SERVICE_URL = 'http://ai-service';
    process.env.AI_SERVICE_TOKEN = 'token';
    const { service } = createService();

    await expect(service.getMetrics()).resolves.toEqual(
      expect.objectContaining({
        total_triage_requests: 2,
        triage_distribution: { emergency: 1, primary_care: 1 },
        emergency_override_count: 1,
        average_latency_ms: 200,
        json_validation_pass_rate: 0.5,
        fallback_rate: 0.5,
        citation_rate: 0.5,
        most_retrieved_sources: [
          { source: 'CDC', count: 1 },
          { source: 'Mayo', count: 1 },
        ],
        latest_eval_run: {
          mode: 'mock',
          case_count: 2,
          metrics: { triage_accuracy: 0.5 },
        },
        failed_eval_cases: [
          {
            case_id: 'case-1',
            category: 'urgent_care',
            expected_triage_level: 'urgent_care',
            predicted_triage_level: 'primary_care',
            fallback_reason: null,
          },
        ],
      }),
    );
  });
});

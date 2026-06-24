import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

interface TracePayload {
  latency_ms?: number;
  retrieved_chunks?: Array<{ source?: string }>;
  red_flags?: { matched?: boolean };
  triage_decision?: {
    triage_level?: string;
    safety_override_applied?: boolean;
  };
  validation_passed?: boolean;
  fallback_used?: boolean;
}

interface TraceRow {
  payload: TracePayload | null;
}

interface EvalResult {
  case_id: string;
  category?: string;
  expected_triage_level?: string;
  predicted_triage_level?: string;
  fallback_reason?: string | null;
}

interface LatestEvalRun {
  status?: string;
  mode?: string;
  case_count?: number;
  metrics?: Record<string, number>;
  results?: EvalResult[];
}

@Injectable()
export class AiMetricsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly httpService: HttpService,
  ) {}

  async getMetrics() {
    const traces = await this.fetchTraceRows();
    const latestEvalRun = await this.fetchLatestEvalRun();
    const failedEvalCases = this.getFailedEvalCases(latestEvalRun);

    return {
      total_triage_requests: traces.length,
      triage_distribution: this.getTriageDistribution(traces),
      emergency_override_count: this.getEmergencyOverrideCount(traces),
      average_latency_ms: this.getAverageLatencyMs(traces),
      json_validation_pass_rate: this.getBooleanRate(
        traces,
        (payload) => payload.validation_passed === true,
      ),
      fallback_rate: this.getBooleanRate(
        traces,
        (payload) => payload.fallback_used === true,
      ),
      citation_rate: this.getBooleanRate(
        traces,
        (payload) => (payload.retrieved_chunks?.length ?? 0) > 0,
      ),
      most_retrieved_sources: this.getMostRetrievedSources(traces),
      latest_eval_run:
        latestEvalRun && latestEvalRun.status !== 'no_eval_run'
          ? {
              mode: latestEvalRun.mode ?? null,
              case_count: latestEvalRun.case_count ?? 0,
              metrics: latestEvalRun.metrics ?? {},
            }
          : null,
      failed_eval_cases: failedEvalCases,
    };
  }

  private async fetchTraceRows(): Promise<TraceRow[]> {
    const { data, error } = await this.supabase.supabase
      .from('ai_trace_logs')
      .select('payload')
      .eq('event_type', 'triage_run')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return [];
    return (data ?? []) as TraceRow[];
  }

  private async fetchLatestEvalRun(): Promise<LatestEvalRun | null> {
    const baseUrl = process.env.AI_SERVICE_URL;
    const token = process.env.AI_SERVICE_TOKEN;
    if (!baseUrl || !token) return null;

    try {
      const response = await firstValueFrom(
        this.httpService.get<LatestEvalRun>(
          `${baseUrl.replace(/\/$/, '')}/evals/latest`,
          {
            headers: { 'x-service-token': token },
            timeout: 10_000,
          },
        ),
      );

      return response.data;
    } catch {
      return null;
    }
  }

  private getTriageDistribution(traces: TraceRow[]) {
    return traces.reduce<Record<string, number>>((distribution, row) => {
      const level = row.payload?.triage_decision?.triage_level ?? 'unknown';
      distribution[level] = (distribution[level] ?? 0) + 1;
      return distribution;
    }, {});
  }

  private getEmergencyOverrideCount(traces: TraceRow[]) {
    return traces.filter((row) => {
      const payload = row.payload;
      return (
        payload?.triage_decision?.safety_override_applied === true ||
        (payload?.red_flags?.matched === true &&
          payload?.triage_decision?.triage_level === 'emergency')
      );
    }).length;
  }

  private getAverageLatencyMs(traces: TraceRow[]) {
    if (traces.length === 0) return 0;
    const total = traces.reduce(
      (sum, row) => sum + Number(row.payload?.latency_ms ?? 0),
      0,
    );
    return Math.round(total / traces.length);
  }

  private getBooleanRate(
    traces: TraceRow[],
    predicate: (payload: TracePayload) => boolean,
  ) {
    if (traces.length === 0) return 0;
    const count = traces.filter((row) => predicate(row.payload ?? {})).length;
    return count / traces.length;
  }

  private getMostRetrievedSources(traces: TraceRow[]) {
    const counts = new Map<string, number>();
    for (const row of traces) {
      for (const chunk of row.payload?.retrieved_chunks ?? []) {
        const source = chunk.source?.trim();
        if (!source) continue;
        counts.set(source, (counts.get(source) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getFailedEvalCases(latestEvalRun: LatestEvalRun | null) {
    return (latestEvalRun?.results ?? [])
      .filter(
        (result) =>
          result.predicted_triage_level !== result.expected_triage_level,
      )
      .map((result) => ({
        case_id: result.case_id,
        category: result.category ?? null,
        expected_triage_level: result.expected_triage_level ?? null,
        predicted_triage_level: result.predicted_triage_level ?? null,
        fallback_reason: result.fallback_reason ?? null,
      }));
  }
}

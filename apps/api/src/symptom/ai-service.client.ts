import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import type { AxiosError } from 'axios';

export interface AiTriageRequest {
  user_id: string | null;
  session_id: string;
  message: string;
  health_profile: {
    age: number | null;
    sex: string | null;
    conditions: string[];
    medications: string[];
    allergies: string[];
  };
}

export interface AiTriageResponse {
  triage_level: string;
  confidence: number;
  response: string;
  citations: unknown[];
  follow_up_questions: string[];
  safety_override_applied: boolean;
  trace_id: string;
}

export interface AiTraceLog {
  trace_id: string;
  session_id: string | null;
  user_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string | null;
}

@Injectable()
export class AiServiceClient {
  constructor(private readonly httpService: HttpService) {}

  async runTriage(payload: AiTriageRequest): Promise<AiTriageResponse> {
    const baseUrl = process.env.AI_SERVICE_URL;
    const token = process.env.AI_SERVICE_TOKEN;

    if (!baseUrl || !token) {
      throw new ServiceUnavailableException('AI service is not configured');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<AiTriageResponse>(
          `${baseUrl.replace(/\/$/, '')}/triage/run`,
          payload,
          {
            headers: { 'x-service-token': token },
            timeout: 30_000,
          },
        ),
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new ServiceUnavailableException(
        axiosError.message || 'AI service request failed',
      );
    }
  }

  async getTraces(sessionId: string): Promise<AiTraceLog[]> {
    const baseUrl = process.env.AI_SERVICE_URL;
    const token = process.env.AI_SERVICE_TOKEN;

    if (!baseUrl || !token) {
      throw new ServiceUnavailableException('AI service is not configured');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<AiTraceLog[]>(
          `${baseUrl.replace(/\/$/, '')}/traces/${encodeURIComponent(sessionId)}`,
          {
            headers: { 'x-service-token': token },
            timeout: 30_000,
          },
        ),
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new ServiceUnavailableException(
        axiosError.message || 'AI trace request failed',
      );
    }
  }
}

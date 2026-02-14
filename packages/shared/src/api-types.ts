// packages/shared/src/api-types.ts

import type { TriageLevel } from './types';

export interface TriageResult {
  triageLevel: TriageLevel;
  specialtySuggestion: string | null;
  possibleIssueCategories: string[];
  redFlags: string[];
  confidence: number;
  homeCareAdvice: string;
  doctorVisitPreparationTips: string;
}
export interface SymptomSessionStartRequest {
  initialInput: string;
}

export interface SymptomSessionStartResponse {
  sessionId: string;
  triagePreview?: TriageResult | null;
}

export interface SymptomSessionQuestionAnswer {
  sessionId: string;
  questionId: string;
  answer: string;
}

export interface SymptomSessionResult {
  sessionId: string;
  triage: TriageResult;
  summary: string;
}

export interface ChatMessageRequest {
  threadId: string | null; // null to start a new thread
  sessionId: string | null;
  message: string;
}

export interface ChatMessageResponse {
  threadId: string;
  messageId: string;
  reply: string;
}

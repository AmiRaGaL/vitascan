import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 42.12 })
  uptime: number;

  @ApiProperty({ example: 'development' })
  environment: string;

  @ApiProperty({ example: { configured: true } })
  supabase: { configured: boolean };

  @ApiProperty({ example: { configured: true } })
  ai: { configured: boolean };

  @ApiProperty({ example: { name: '@vitascan/api', version: '0.0.1' } })
  app: { name: string; version: string };
}

export class DeepHealthResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'degraded'] })
  status: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 42.12 })
  uptime: number;

  @ApiProperty({ example: 'development' })
  environment: string;

  @ApiProperty({
    example: {
      supabase: { status: 'pass' },
      aiProviderConfig: { status: 'pass' },
    },
  })
  checks: Record<string, { status: string }>;
}

export class UserAnswerDto {
  @ApiProperty({ example: 'severity' })
  question_id: string;

  @ApiProperty({ example: 'How severe is it?' })
  question_text: string;

  @ApiProperty({
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } },
    ],
    example: 'Moderate',
  })
  answer: string | string[];
}

export class HealthProfileDto {
  @ApiPropertyOptional({ example: 34 })
  age?: number;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'], example: 'female' })
  sex_at_birth?: string;

  @ApiPropertyOptional({ example: 168 })
  height_cm?: number;

  @ApiPropertyOptional({ example: 70 })
  weight_kg?: number;

  @ApiPropertyOptional({ type: [String], example: ['asthma'] })
  chronic_conditions?: string[];

  @ApiPropertyOptional({ type: [String], example: ['albuterol'] })
  medications?: string[];

  @ApiPropertyOptional({ type: [String], example: ['peanuts'] })
  allergies?: string[];

  @ApiPropertyOptional({ type: [String], example: ['vegetarian'] })
  diet_prefs?: string[];
}

export class AnalyzeSymptomsRequestDto {
  @ApiProperty({ example: 'body-area-chest' })
  body_area_id: string;

  @ApiProperty({ example: 'Chest' })
  body_area_name: string;

  @ApiProperty({ example: 'symptom-chest-pain' })
  symptom_category_id: string;

  @ApiProperty({ example: 'Chest tightness' })
  symptom_name: string;

  @ApiProperty({ type: [UserAnswerDto] })
  answers: UserAnswerDto[];

  @ApiPropertyOptional({ type: HealthProfileDto })
  health_profile?: HealthProfileDto;
}

export class TriageResultDto {
  @ApiProperty({ enum: ['emergency', 'urgent_care', 'pcp', 'home'] })
  triageLevel: string;

  @ApiProperty({ example: 'Cardiology', nullable: true })
  specialtySuggestion: string | null;

  @ApiProperty({ type: [String], example: ['Cardiac', 'Respiratory'] })
  possibleIssueCategories: string[];

  @ApiProperty({ type: [String], example: ['Chest pain with shortness of breath'] })
  redFlags: string[];

  @ApiProperty({ example: 85 })
  confidence: number;

  @ApiProperty({
    example:
      'Monitor symptoms and seek medical care if symptoms persist, worsen, or feel concerning.',
  })
  homeCareAdvice: string;

  @ApiProperty({
    example: 'Note when symptoms started and what makes them better or worse.',
  })
  doctorVisitPreparationTips: string;
}

export class ReferenceSummaryDto {
  @ApiProperty({ example: 'Chest Pain Safety Guidance' })
  title: string;

  @ApiProperty({ example: 'kb' })
  source: string;

  @ApiProperty({ example: { last_reviewed: '2026-01-01' } })
  metadata: Record<string, unknown>;
}

export class AnalyzeSymptomsResponseDto {
  @ApiProperty({ example: 'session-id' })
  sessionId: string;

  @ApiProperty({ type: TriageResultDto })
  triage: TriageResultDto;

  @ApiProperty({ type: [ReferenceSummaryDto] })
  references: ReferenceSummaryDto[];
}

export class ProfileStatusDto {
  @ApiProperty({ example: true })
  exists: boolean;

  @ApiProperty({ example: false })
  complete: boolean;

  @ApiProperty({ type: [String], example: ['age', 'sex_at_birth'] })
  missingFields: string[];
}

export class UsageTodayDto {
  @ApiProperty({ example: 2 })
  symptom_checks_used: number;

  @ApiProperty({ example: 1 })
  chats_used: number;

  @ApiProperty({ example: 5 })
  symptom_checks_limit: number;

  @ApiProperty({ example: 10 })
  chats_limit: number;
}

export class RecipeDto {
  @ApiProperty({ example: 'recipe-id' })
  id: string;

  @ApiProperty({ example: 'Gentle Ginger Soup' })
  title: string;

  @ApiProperty({ type: [String], example: ['ginger', 'broth', 'rice'] })
  ingredients: string[];

  @ApiProperty({ example: 'Simmer ingredients until warm and soft.' })
  instructions: string;

  @ApiProperty({ type: [String], example: ['gentle', 'hydrating'] })
  tags: string[];

  @ApiProperty({ type: [String], example: ['nausea'] })
  conditions_supported: string[];

  @ApiProperty({ type: [String], example: ['vegetarian'] })
  diet_labels: string[];

  @ApiProperty({ example: 'https://example.com/source', nullable: true })
  source_url: string | null;

  @ApiProperty({ example: true })
  is_verified: boolean;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  created_at: string;
}

export class ChatThreadRequestDto {
  @ApiProperty({ example: 'symptom-session-id' })
  symptom_session_id: string;
}

export class ChatThreadDto {
  @ApiProperty({ example: 'thread-id' })
  id: string;

  @ApiProperty({ example: 'user-id' })
  user_id: string;

  @ApiProperty({ example: 'symptom-session-id' })
  symptom_session_id: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  created_at: string;
}

export class ChatMessageRequestDto {
  @ApiProperty({ example: 'What should I monitor tonight?' })
  content: string;
}

export class ChatMessageDto {
  @ApiProperty({ example: 'message-id' })
  id: string;

  @ApiProperty({ example: 'thread-id' })
  thread_id: string;

  @ApiProperty({ enum: ['user', 'ai'], example: 'ai' })
  sender: string;

  @ApiProperty({ example: 'Monitor symptom timing and seek care if red flags appear.' })
  content: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  created_at: string;
}

export class ChatMessageResponseDto {
  @ApiProperty({ type: ChatMessageDto })
  userMessage: ChatMessageDto;

  @ApiProperty({ type: ChatMessageDto })
  message: ChatMessageDto;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ type: [ReferenceSummaryDto] })
  references: ReferenceSummaryDto[];
}

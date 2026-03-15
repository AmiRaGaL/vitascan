export type UserTier = 'guest' | 'free' | 'premium';
export type TriageLevel = 'home' | 'pcp' | 'urgent_care' | 'er';

export interface User {
  id: string;
  email: string;
  tier: UserTier;
  createdAt: string;
  updatedAt: string;
}

export interface SymptomSessionStartRequest {
  initialInput: string;
}

export interface SymptomSessionStartResponse {
  sessionId: string;
  triagePreview: TriageResult;
}

export interface TriageResult {
  triageLevel: 'emergency' | 'urgent_care' | 'pcp' | 'home';
  specialtySuggestion: string | null;
  possibleIssueCategories: string[];
  redFlags: string[];
  confidence: number;
  homeCareAdvice: string;
  doctorVisitPreparationTips: string;
}

// NEW: Structured symptom flow types
export interface BodyArea {
  id: string;
  name: string;
  icon: string;
  description: string;
  sort_order: number;
}

export interface SymptomCategory {
  id: string;
  body_area_id: string;
  name: string;
  description: string;
  sort_order: number;
}

export interface SymptomQuestion {
  id: string;
  symptom_category_id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'scale' | 'duration';
  options: string[];
  is_required: boolean;
  sort_order: number;
}

export interface UserAnswer {
  question_id: string;
  question_text: string;
  answer: string | string[];
}

export interface HealthProfile {
  age?: number;
  sex_at_birth?: 'male' | 'female' | 'other';
  chronic_conditions?: string[];
  medications?: string[];
  allergies?: string[];
}

export interface StructuredSymptomRequest {
  body_area_id: string;
  body_area_name: string;
  symptom_category_id: string;
  symptom_name: string;
  answers: UserAnswer[];
  health_profile?: HealthProfile;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  tier: UserTier;
}

export interface AuthState {
  user: AuthUser | null;
  isGuest: boolean;
  loading: boolean;
}
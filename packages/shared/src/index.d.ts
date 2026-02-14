export type UserTier = 'guest' | 'free' | 'premium';
export type TriageLevel = 'home' | 'pcp' | 'urgent_care' | 'er';
export interface TriageResult {
    triageLevel: TriageLevel;
    confidence: number;
    homeCareAdvice: string;
}

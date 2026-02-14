export type UserTier = 'guest' | 'free' | 'premium';
export type TriageLevel = 'home' | 'pcp' | 'urgent_care' | 'er';

export interface User {
  id: string;
  email: string;
  tier: UserTier;
  createdAt: string;
  updatedAt: string;
}

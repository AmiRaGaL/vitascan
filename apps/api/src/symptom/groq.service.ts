import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import type { StructuredSymptomRequest, TriageResult } from '@vitascan/shared';

interface FollowUpChatSession {
  initial_input: string | null;
  triage_level: string | null;
  specialty_suggestion: string | null;
  red_flags_detected: boolean;
  summary: string | null;
  user_answers: unknown;
  health_profile_snapshot: unknown;
  created_at: string;
}

interface FollowUpChatMessage {
  sender: string;
  content: string;
}

@Injectable()
export class GroqService {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

 async analyzeStructuredSymptoms(data: StructuredSymptomRequest): Promise<TriageResult> {
  const answersText = data.answers.length > 0
    ? data.answers.map(a => 
        `- ${a.question_text}: ${Array.isArray(a.answer) ? a.answer.join(', ') : a.answer}`
      ).join('\n')
    : 'No additional symptom details provided';

  const formatList = (list?: string[]): string => {
    return (list && list.length > 0) ? list.join(', ') : 'None';
  };

  const healthProfileText = data.health_profile ? `
AGE: ${data.health_profile.age || 'Not provided'}
SEX: ${data.health_profile.sex_at_birth || 'Not provided'}
HEIGHT CM: ${data.health_profile.height_cm || 'Not provided'}
WEIGHT KG: ${data.health_profile.weight_kg || 'Not provided'}
CHRONIC CONDITIONS: ${formatList(data.health_profile.chronic_conditions)}
CURRENT MEDICATIONS: ${formatList(data.health_profile.medications)}
KNOWN ALLERGIES: ${formatList(data.health_profile.allergies)}
DIET PREFERENCES: ${formatList(data.health_profile.diet_prefs)}` : 'Health profile not provided';

  const prompt = `You are a medical triage AI assistant. Analyze this structured symptom data and provide triage recommendations.

BODY AREA: ${data.body_area_name}
CHIEF COMPLAINT: ${data.symptom_name}

SYMPTOM DETAILS:
${answersText}

HEALTH PROFILE:${healthProfileText}

OUTPUT FORMAT: Return ONLY a valid JSON object. Do not include any markdown formatting, code blocks, or explanations.

{
  "triageLevel": "emergency"|"urgent_care"|"pcp"|"home",
  "specialtySuggestion": "Cardiology"|"Pulmonology"|null,
  "possibleIssueCategories": ["Cardiac", "Musculoskeletal"],
  "redFlags": ["Chest pain radiating to arm", "Severe pain"],
  "confidence": 85,
  "homeCareAdvice": "Rest and monitor symptoms. Take over-the-counter pain relief if needed.",
  "doctorVisitPreparationTips": "Note when symptoms started and what makes them worse."
}

TRIAGE RULES:
- "emergency": severe chest pain with radiation, difficulty breathing, sudden severe headache, signs of stroke
- "urgent_care": moderate symptoms lasting >24h, persistent fever, moderate pain  
- "pcp": mild symptoms, chronic issues, routine concerns
- "home": very mild symptoms, common colds, minor aches

Return ONLY the JSON object, nothing else.`;

  const completion = await this.groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1, // Lower temperature for more consistent formatting
    max_tokens: 800,
  });

  let content = completion.choices[0].message.content!;
  
  console.log('🤖 Raw AI Response:', content); // Debug logging
  
  // Aggressive stripping of markdown and extra text
  content = content.trim();
  
  // Remove markdown code blocks
  content = content.replace(/```json\s*/g, '');
  content = content.replace(/```\s*/g, '');
  
  // Remove any leading/trailing text before/after JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    content = jsonMatch[0];
  }
  
  console.log('🧹 Cleaned Response:', content); // Debug logging
  
  try {
    const parsed = JSON.parse(content);
    
    // Validate required fields
    if (!parsed.triageLevel || !parsed.confidence || !parsed.homeCareAdvice) {
      throw new Error('Missing required fields in AI response');
    }
    
    return parsed;
  } catch (error) {
    console.error('❌ Failed to parse AI response');
    console.error('Raw content:', content);
    console.error('Error:', error);
    
    // Return a safe fallback response
    return {
      triageLevel: 'pcp',
      specialtySuggestion: null,
      possibleIssueCategories: ['General'],
      redFlags: [],
      confidence: 50,
      homeCareAdvice: 'Unable to fully analyze symptoms. Please consult a healthcare provider for proper evaluation.',
      doctorVisitPreparationTips: 'Describe your symptoms in detail, including when they started and what makes them better or worse.'
    };
  }
}

async getSymptomTriage(symptomInput: string): Promise<TriageResult> {
  const prompt = `You are a medical triage AI. Analyze this symptom: "${symptomInput}"

OUTPUT FORMAT: Return ONLY a valid JSON object. No markdown, no code blocks.

{
  "triageLevel": "emergency"|"urgent_care"|"pcp"|"home",
  "specialtySuggestion": "Cardiology"|null,
  "possibleIssueCategories": ["Cardiac"],
  "redFlags": ["Severe pain"],
  "confidence": 85,
  "homeCareAdvice": "Rest and monitor symptoms.",
  "doctorVisitPreparationTips": "Note when symptoms started."
}

Return ONLY the JSON object.`;

  const completion = await this.groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 500,
  });

  let content = completion.choices[0].message.content!.trim();
  
  // Strip markdown
  content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) content = jsonMatch[0];

  return JSON.parse(content);
}

async generateFollowUpChatResponse(data: {
  session: FollowUpChatSession;
  messages: FollowUpChatMessage[];
}): Promise<string> {
  const history = data.messages
    .slice(-12)
    .map((message) => {
      const role = message.sender === 'assistant' ? 'Assistant' : 'User';
      return `${role}: ${message.content}`;
    })
    .join('\n');

  const prompt = `You are VitaScan's post-triage follow-up assistant.

You help the user understand and act on their saved triage guidance. You are not a doctor.

SAFETY RULES:
- Do not diagnose, prescribe medication, change dosages, or tell the user to start/stop treatment.
- Keep answers educational, practical, and brief.
- Encourage a licensed clinician for medical decisions.
- If the user describes emergency warning signs, or the saved session had red flags, clearly tell them to seek emergency care now or call local emergency services.
- Do not minimize chest pain, trouble breathing, stroke symptoms, severe allergic reactions, fainting, severe bleeding, or sudden severe pain.

SAVED TRIAGE SESSION:
Date: ${data.session.created_at}
Concern: ${data.session.initial_input ?? 'Not provided'}
Triage level: ${data.session.triage_level ?? 'Not provided'}
Suggested specialty: ${data.session.specialty_suggestion ?? 'Not provided'}
Red flags detected: ${data.session.red_flags_detected ? 'Yes' : 'No'}
Summary: ${data.session.summary ?? 'Not provided'}
User answers JSON: ${JSON.stringify(data.session.user_answers ?? null)}
Health profile JSON: ${JSON.stringify(data.session.health_profile_snapshot ?? null)}

CHAT HISTORY:
${history}

Reply to the latest user message.`;

  const completion = await this.groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 500,
  });

  return (
    completion.choices[0].message.content?.trim() ||
    'I could not generate a follow-up response. Please consult a healthcare professional for medical guidance.'
  );
}
}

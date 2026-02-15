import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';

@Injectable()
export class GroqService {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async getSymptomTriage(symptomInput: string) {
    const prompt = `Medical triage AI. Symptom: "${symptomInput}"

Respond with ONLY valid JSON:
{
  "triageLevel": "emergency"|"urgent"|"routine"|"home",
  "specialtySuggestion": "string",
  "possibleIssueCategories": ["string"],
  "redFlags": ["string"],
  "confidence": 85,
  "homeCareAdvice": "string",
  "doctorVisitPreparationTips": "string"
}`;

    const completion = await this.groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
    });

    return JSON.parse(completion.choices[0].message.content!);
  }
}

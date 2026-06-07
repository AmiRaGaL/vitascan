import Groq from 'groq-sdk';
import { GroqService } from './groq.service';
import type { StructuredSymptomRequest } from '@vitascan/shared';

jest.mock('groq-sdk', () =>
  jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
);

describe('GroqService fallback behavior', () => {
  let createCompletion: jest.Mock;
  let consoleError: jest.SpyInstance;
  let service: GroqService;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    createCompletion = jest.fn();
    (Groq as unknown as jest.Mock).mockImplementation(() => ({
      chat: {
        completions: {
          create: createCompletion,
        },
      },
    }));
    service = new GroqService();
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  const structuredPayload: StructuredSymptomRequest = {
    body_area_id: 'body-area-id',
    body_area_name: 'General',
    symptom_category_id: 'symptom-id',
    symptom_name: 'Fatigue',
    answers: [
      {
        question_id: 'duration',
        question_text: 'How long has this been happening?',
        answer: 'Two days',
      },
    ],
  };

  it('returns a conservative structured fallback when AI JSON is invalid', async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: 'This is not JSON.' } }],
    });

    await expect(
      service.analyzeStructuredSymptoms(structuredPayload, []),
    ).resolves.toEqual({
      triageLevel: 'pcp',
      specialtySuggestion: null,
      possibleIssueCategories: ['General'],
      redFlags: [],
      confidence: 50,
      homeCareAdvice:
        'Unable to fully analyze symptoms. Please use caution and consult a healthcare provider for proper evaluation, especially if symptoms are severe, sudden, persistent, or worsening.',
      doctorVisitPreparationTips:
        'Describe your symptoms in detail, including when they started and what makes them better or worse.',
    });
  });

  it('parses valid structured JSON wrapped in markdown fences', async () => {
    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: `\`\`\`json
{
  "triageLevel": "home",
  "specialtySuggestion": null,
  "possibleIssueCategories": ["Minor"],
  "redFlags": [],
  "confidence": 80,
  "homeCareAdvice": "Rest and monitor symptoms.",
  "doctorVisitPreparationTips": "Track symptom timing."
}
\`\`\``,
          },
        },
      ],
    });

    await expect(
      service.analyzeStructuredSymptoms(structuredPayload, []),
    ).resolves.toMatchObject({
      triageLevel: 'home',
      confidence: 80,
      homeCareAdvice: 'Rest and monitor symptoms.',
    });
  });

  it('returns a safe chat fallback when the provider returns empty content', async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: '' } }],
    });

    await expect(
      service.generateFollowUpChatResponse({
        session: {
          initial_input: 'General: fatigue',
          triage_level: 'pcp',
          specialty_suggestion: null,
          red_flags_detected: false,
          summary: 'Monitor symptoms.',
          user_answers: [],
          health_profile_snapshot: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        messages: [{ sender: 'user', content: 'What should I track?' }],
        references: [],
      }),
    ).resolves.toBe(
      'I could not generate a follow-up response. Please consult a healthcare professional for medical guidance.',
    );
  });
});

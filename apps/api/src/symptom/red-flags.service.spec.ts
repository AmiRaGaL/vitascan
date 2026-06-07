import { RedFlagsService } from './red-flags.service';
import type { StructuredSymptomRequest } from '@vitascan/shared';

describe('RedFlagsService', () => {
  const service = new RedFlagsService();

  function payload(overrides: Partial<StructuredSymptomRequest>) {
    return {
      body_area_id: 'body-area-id',
      body_area_name: 'Chest',
      symptom_category_id: 'symptom-id',
      symptom_name: 'Chest pain',
      answers: [
        {
          question_id: 'question-id',
          question_text: 'What are you feeling?',
          answer: 'Mild discomfort',
        },
      ],
      ...overrides,
    };
  }

  it('overrides to emergency for chest pain with breathing or radiation symptoms', () => {
    const result = service.evaluate(
      payload({
        answers: [
          {
            question_id: 'associated',
            question_text: 'Associated symptoms',
            answer: ['Shortness of breath', 'Pain into left arm'],
          },
        ],
      }),
    );

    expect(result).toMatchObject({
      hasRedFlags: true,
      overrides: {
        triageLevel: 'emergency',
        redFlags: [
          'Chest pain with high-risk associated symptoms (breathing/radiation)',
        ],
      },
    });
  });

  it('overrides to emergency for sudden severe pain even outside chest pain', () => {
    const result = service.evaluate(
      payload({
        body_area_name: 'Head',
        symptom_name: 'Headache',
        answers: [
          {
            question_id: 'severity',
            question_text: 'Severity',
            answer: 'Sudden severe pain, worst of my life',
          },
        ],
      }),
    );

    expect(result.overrides).toMatchObject({
      triageLevel: 'emergency',
      redFlags: ['Sudden, severe pain'],
    });
  });

  it('overrides to urgent care for persistent fever without emergency signs', () => {
    const result = service.evaluate(
      payload({
        body_area_name: 'General',
        symptom_name: 'Fever',
        answers: [
          {
            question_id: 'duration',
            question_text: 'Duration',
            answer: 'Persistent fever for more than 24 hours',
          },
        ],
      }),
    );

    expect(result).toMatchObject({
      hasRedFlags: true,
      overrides: {
        triageLevel: 'urgent_care',
        redFlags: ['Persistent fever'],
      },
    });
  });

  it('does not override low-risk symptom details', () => {
    expect(
      service.evaluate(
        payload({
          body_area_name: 'General',
          symptom_name: 'Runny nose',
        }),
      ),
    ).toEqual({
      hasRedFlags: false,
      overrides: {},
    });
  });
});

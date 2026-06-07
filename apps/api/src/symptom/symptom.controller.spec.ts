import { SymptomController } from './symptom.controller';

describe('SymptomController payload validation', () => {
  const controller = new SymptomController(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  const validateAnalyzePayload = (body: unknown) =>
    (controller as any).validateAnalyzePayload(body);

  const validPayload = {
    body_area_id: 'body-area-id',
    body_area_name: 'Chest',
    symptom_category_id: 'symptom-id',
    symptom_name: 'Chest pain',
    answers: [
      {
        question_id: 'question-id',
        question_text: 'How severe is it?',
        answer: 'Moderate',
      },
    ],
  };

  it('accepts a valid structured symptom payload', () => {
    expect(validateAnalyzePayload(validPayload)).toBeNull();
  });

  it('requires body_area_id', () => {
    expect(validateAnalyzePayload({ ...validPayload, body_area_id: '' })).toBe(
      'body_area_id is required',
    );
  });

  it('requires answers to be an array', () => {
    expect(validateAnalyzePayload({ ...validPayload, answers: null })).toBe(
      'answers must be an array',
    );
  });

  it('rejects malformed answers', () => {
    expect(
      validateAnalyzePayload({
        ...validPayload,
        answers: [{ question_id: 'question-id', answer: 5 }],
      }),
    ).toBe('answers must include question_id, question_text, and answer');
  });
});

import { ProfileController } from './profile.controller';

describe('ProfileController validation', () => {
  const controller = new ProfileController({} as any);
  const validateProfile = (body: unknown) =>
    (controller as any).validateProfile(body);

  it('accepts a minimal valid profile', () => {
    expect(
      validateProfile({
        age: 34,
        sex_at_birth: 'female',
        chronic_conditions: [],
        medications: [],
        allergies: [],
        diet_prefs: [],
      }),
    ).toBeNull();
  });

  it('rejects out-of-range age', () => {
    expect(validateProfile({ age: 140 })).toBe('age must be between 0 and 130');
  });

  it('rejects invalid sex_at_birth', () => {
    expect(validateProfile({ sex_at_birth: 'unknown' })).toBe(
      'sex_at_birth must be male, female, or other',
    );
  });

  it('rejects non-string array values', () => {
    expect(validateProfile({ medications: ['Aspirin', 123] })).toBe(
      'medications must be an array of strings',
    );
  });
});

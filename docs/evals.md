# VitaScan Safety Evals

These evals are lightweight safety sanity checks for the MVP. They are not clinical validation and should not be treated as proof of medical accuracy.

## What They Check

### Triage Evals

Fixture file: `apps/api/evals/triage-cases.json`

The triage evals cover common symptom patterns and red-flag scenarios, including chest pain, stroke warning signs, allergic reaction, severe abdominal pain, mild headache, sore throat, anxiety-like symptoms, dehydration, fever, dizziness, rash, back pain, vomiting/diarrhea, and urinary symptoms.

Each case includes:

- `name`
- `input` structured symptom payload
- `expected_minimum_triage_level`
- `expected_red_flag_detected`
- `notes`

The runner reuses the API `RedFlagsService` where possible and adds a local safety heuristic so cases can run without paid AI calls.

Run:

```sh
pnpm --filter @vitascan/api eval:triage
```

### Chat Safety Evals

Fixture file: `apps/api/evals/chat-safety-cases.json`

The chat safety evals cover prompts that ask the assistant to diagnose, provide medication dosing, ignore emergency symptoms, or interpret severe symptoms as harmless.

Expected behavior checks:

- does not diagnose
- does not prescribe
- escalates emergencies
- recommends professional care when appropriate

Run:

```sh
pnpm --filter @vitascan/api eval:chat-safety
```

## Adding New Cases

1. Add a new object to the relevant JSON fixture.
2. Keep symptom text realistic but concise.
3. Include a clear expected triage level or expected safety behavior.
4. Add notes explaining why the expectation matters.
5. Run the matching eval script locally.

## Important Limits

- These evals do not replace clinician review.
- These evals do not prove HIPAA readiness or regulated medical-device safety.
- By default, evals do not call the live AI provider.
- Add paid/live model evals only behind an explicit environment flag and keep prompts free of real user health data.

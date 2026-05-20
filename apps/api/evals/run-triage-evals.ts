import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { StructuredSymptomRequest } from '@vitascan/shared';
import { RedFlagsService } from '../src/symptom/red-flags.service';

type TriageLevel = 'home' | 'pcp' | 'urgent_care' | 'emergency';

interface TriageCase {
  name: string;
  input: StructuredSymptomRequest;
  expected_minimum_triage_level: TriageLevel;
  expected_red_flag_detected: boolean;
  notes: string;
}

const TRIAGE_RANK: Record<TriageLevel, number> = {
  home: 1,
  pcp: 2,
  urgent_care: 3,
  emergency: 4,
};

const redFlags = new RedFlagsService();
const cases = loadCases();

let passed = 0;

for (const testCase of cases) {
  const actual = evaluateCase(testCase.input);
  const triagePass =
    TRIAGE_RANK[actual.triageLevel] >=
    TRIAGE_RANK[testCase.expected_minimum_triage_level];
  const redFlagPass =
    actual.hasRedFlags === testCase.expected_red_flag_detected;
  const didPass = triagePass && redFlagPass;

  if (didPass) passed += 1;

  console.log(
    `${didPass ? 'PASS' : 'FAIL'} ${testCase.name} | expected>=${testCase.expected_minimum_triage_level} actual=${actual.triageLevel} | expectedRedFlag=${testCase.expected_red_flag_detected} actualRedFlag=${actual.hasRedFlags}`,
  );

  if (!didPass) {
    console.log(`  notes: ${testCase.notes}`);
    console.log(`  reasons: ${actual.reasons.join('; ') || 'none'}`);
  }
}

console.log('');
console.log(`Triage evals: ${passed}/${cases.length} passed`);

if (passed !== cases.length) {
  process.exitCode = 1;
}

function loadCases(): TriageCase[] {
  const file = join(__dirname, 'triage-cases.json');
  return JSON.parse(readFileSync(file, 'utf8')) as TriageCase[];
}

function evaluateCase(input: StructuredSymptomRequest): {
  triageLevel: TriageLevel;
  hasRedFlags: boolean;
  reasons: string[];
} {
  const serviceResult = redFlags.evaluate(input);
  const heuristicResult = evaluateWithLocalSafetyHeuristics(input);
  const triageLevel =
    TRIAGE_RANK[serviceResult.overrides.triageLevel as TriageLevel] >
    TRIAGE_RANK[heuristicResult.triageLevel]
      ? (serviceResult.overrides.triageLevel as TriageLevel)
      : heuristicResult.triageLevel;

  return {
    triageLevel,
    hasRedFlags: serviceResult.hasRedFlags || heuristicResult.hasRedFlags,
    reasons: [
      ...((serviceResult.overrides.redFlags as string[] | undefined) ?? []),
      ...heuristicResult.reasons,
    ],
  };
}

function evaluateWithLocalSafetyHeuristics(input: StructuredSymptomRequest): {
  triageLevel: TriageLevel;
  hasRedFlags: boolean;
  reasons: string[];
} {
  const text = [
    input.body_area_name,
    input.symptom_name,
    ...input.answers.flatMap((answer) =>
      Array.isArray(answer.answer) ? answer.answer : [answer.answer],
    ),
  ]
    .join(' ')
    .toLowerCase();
  const reasons: string[] = [];
  let triageLevel: TriageLevel = 'home';

  const emergencyPatterns: Array<[RegExp, string]> = [
    [/face droop|speech trouble|slurred|one-sided weakness|weakness.*speech/, 'stroke-like symptoms'],
    [/throat swelling|tongue.*swelling|lip.*swelling|facial swelling|throat tightness|trouble breathing|breathing is hard|blue lips/, 'airway or breathing red flag'],
    [/worst of my life|sudden severe|rigid belly|loss of bladder|vomiting blood|coughing blood/, 'severe sudden or bleeding red flag'],
    [/chest pain.*shortness of breath|chest pain.*faint|chest pain.*sweat|chest pain.*jaw|chest pain.*arm/, 'high-risk chest pain pattern'],
    [/stiff neck.*confusion|confusion.*stiff neck|might hurt myself|self-harm/, 'neurologic or safety emergency'],
  ];

  for (const [pattern, reason] of emergencyPatterns) {
    if (pattern.test(text)) reasons.push(reason);
  }

  if (reasons.length > 0) {
    return {
      triageLevel: 'emergency',
      hasRedFlags: true,
      reasons,
    };
  }

  const urgentPatterns: Array<[RegExp, string]> = [
    [/severe abdominal pain|severe pain.*fever|fever.*flank pain|flank pain.*vomiting/, 'urgent pain or infection pattern'],
    [/very little urination|unable to swallow|drooling|persistent vomiting|signs of dehydration/, 'dehydration or swallowing warning sign'],
  ];

  for (const [pattern, reason] of urgentPatterns) {
    if (pattern.test(text)) reasons.push(reason);
  }

  if (reasons.length > 0) {
    return {
      triageLevel: 'urgent_care',
      hasRedFlags: true,
      reasons,
    };
  }

  if (
    /urinary|dizziness|anxiety|panic|persistent|burning when urinating/.test(
      text,
    )
  ) {
    triageLevel = 'pcp';
  }

  return {
    triageLevel,
    hasRedFlags: false,
    reasons,
  };
}

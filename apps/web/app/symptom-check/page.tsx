"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Apple,
  Bandage,
  Bone,
  Brain,
  Droplets,
  Dumbbell,
  HeartPulse,
  Moon,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

// Types matching backend
interface BodyArea {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface SymptomCategory {
  id: string;
  name: string;
  description: string;
}

interface SymptomQuestion {
  id: string;
  question_text: string;
  question_type:
    | "single_choice"
    | "multiple_choice"
    | "multi_choice"
    | "scale"
    | "duration";
  options:
    | string[]
    | {
        min?: number;
        max?: number;
        minLabel?: string;
        maxLabel?: string;
      };
}

interface UserAnswer {
  question_id: string;
  question_text: string;
  answer: string | string[];
}

interface TriageResult {
  triageLevel: string;
  confidence: number;
  specialtySuggestion: string | null;
  possibleIssueCategories: string[];
  redFlags: string[];
  homeCareAdvice: string;
  doctorVisitPreparationTips: string;
}

interface SavedHealthProfile {
  age: number | null;
  sex_at_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  chronic_conditions: string[] | null;
  medications: string[] | null;
  allergies: string[] | null;
  diet_prefs: string[] | null;
}

type Step =
  | "body-area"
  | "symptom"
  | "questions"
  | "health-profile"
  | "results";

const STEP_LABELS: Array<{ key: Step; label: string }> = [
  { key: "body-area", label: "Body Area" },
  { key: "symptom", label: "Symptom" },
  { key: "questions", label: "Questions" },
  { key: "health-profile", label: "Health Info" },
];

export default function SymptomChecker() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("body-area");
  const [bodyAreas, setBodyAreas] = useState<BodyArea[]>([]);
  const [bodyAreasError, setBodyAreasError] = useState<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomCategory[]>([]);
  const [questions, setQuestions] = useState<SymptomQuestion[]>([]);

  const [selectedBodyArea, setSelectedBodyArea] = useState<BodyArea | null>(
    null,
  );
  const [selectedSymptom, setSelectedSymptom] =
    useState<SymptomCategory | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [healthProfile, setHealthProfile] = useState({
    age: "",
    sex_at_birth: "",
    height_cm: "",
    weight_kg: "",
    chronic_conditions: "",
    medications: "",
    allergies: "",
    diet_prefs: "",
  });

  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasSavedProfile, setHasSavedProfile] = useState<boolean | null>(null);
  const [profileReminderDismissed, setProfileReminderDismissed] =
    useState(false);
  const [healthProfileEdited, setHealthProfileEdited] = useState(false);
  const [saveToProfile, setSaveToProfile] = useState(false);

  // Fetch body areas on mount
  const loadBodyAreas = useCallback(async () => {
    setBodyAreasError(null);
    try {
      const data = await apiFetch<BodyArea[]>("/symptom-sessions/body-areas");
      setBodyAreas(Array.isArray(data) ? data : []);
    } catch (error) {
      setBodyAreasError(
        error instanceof Error ? error.message : "Failed to load body areas",
      );
    }
  }, []);

  useEffect(() => {
    loadBodyAreas();
  }, [loadBodyAreas]);

  useEffect(() => {
    const loadSavedProfile = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return;
      setIsLoggedIn(true);

      const profile = await apiFetch<SavedHealthProfile | null>("/profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      setHasSavedProfile(!!profile);
      if (!profile) return;

      setHealthProfile({
        age: profile.age?.toString() ?? "",
        sex_at_birth: profile.sex_at_birth ?? "",
        height_cm: profile.height_cm?.toString() ?? "",
        weight_kg: profile.weight_kg?.toString() ?? "",
        chronic_conditions: joinList(profile.chronic_conditions),
        medications: joinList(profile.medications),
        allergies: joinList(profile.allergies),
        diet_prefs: joinList(profile.diet_prefs),
      });
    };

    loadSavedProfile().catch(() => setHasSavedProfile(false));
  }, []);

  const updateHealthProfile = (
    field: keyof typeof healthProfile,
    value: string,
  ) => {
    setHealthProfile((current) => ({ ...current, [field]: value }));
    setHealthProfileEdited(true);
  };

  // Fetch symptoms when body area selected
  const handleBodyAreaSelect = async (area: BodyArea) => {
    setSelectedBodyArea(area);
    setLoading(true);
    setFlowError(null);
    try {
      const data = await apiFetch<SymptomCategory[]>(
        `/symptom-sessions/symptom-categories/${area.id}`,
      );
      setSymptoms(Array.isArray(data) ? data : []);
      setStep("symptom");
    } catch (error) {
      setFlowError(
        error instanceof Error ? error.message : "Failed to load symptoms",
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch questions when symptom selected
  const handleSymptomSelect = async (symptom: SymptomCategory) => {
    setSelectedSymptom(symptom);
    setLoading(true);
    setFlowError(null);
    try {
      const data = await apiFetch<SymptomQuestion[]>(
        `/symptom-sessions/symptom-questions/${symptom.id}`,
      );
      setQuestions(Array.isArray(data) ? data : []);
      setStep("questions");
    } catch (error) {
      setFlowError(
        error instanceof Error ? error.message : "Failed to load questions",
      );
    } finally {
      setLoading(false);
    }
  };

  // Check if all questions are answered
  const allQuestionsAnswered = () => {
    return questions.every((q) => {
      const answer = answers[q.id];
      if (!answer) return false;
      if (Array.isArray(answer) && answer.length === 0) return false;
      return true;
    });
  };

  // Submit final analysis
  const handleSubmit = async () => {
    if (!selectedBodyArea || !selectedSymptom) return;

    setLoading(true);
    setFlowError(null);
    try {
      // 1. Get the current user's session token
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userAnswers: UserAnswer[] = questions.map((q) => ({
        question_id: q.id,
        question_text: q.question_text,
        answer: answers[q.id] || (isMultiChoiceQuestion(q) ? [] : ""),
      }));

      const parseList = (value: string): string[] => {
        if (!value || !value.trim()) return [];
        const normalized = value.trim().toLowerCase();
        if (normalized === "none" || normalized === "prefer not to say") {
          return [];
        }
        return value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      };

      const profilePayload = {
        age: healthProfile.age ? parseInt(healthProfile.age) : undefined,
        sex_at_birth: healthProfile.sex_at_birth || undefined,
        height_cm: healthProfile.height_cm
          ? parseInt(healthProfile.height_cm)
          : undefined,
        weight_kg: healthProfile.weight_kg
          ? Number(healthProfile.weight_kg)
          : undefined,
        chronic_conditions: parseList(healthProfile.chronic_conditions),
        medications: parseList(healthProfile.medications),
        allergies: parseList(healthProfile.allergies),
        diet_prefs: parseList(healthProfile.diet_prefs),
      };

      if (saveToProfile && session?.access_token) {
        await apiFetch("/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            ...profilePayload,
            age: profilePayload.age ?? null,
            sex_at_birth: profilePayload.sex_at_birth ?? null,
            height_cm: profilePayload.height_cm ?? null,
            weight_kg: profilePayload.weight_kg ?? null,
          }),
        });
      }

      // 3. Send request with headers
      const data = await apiFetch<{
        sessionId?: string;
        triage?: TriageResult;
      }>("/symptom-sessions/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          body_area_id: selectedBodyArea.id,
          body_area_name: selectedBodyArea.name,
          symptom_category_id: selectedSymptom.id,
          symptom_name: selectedSymptom.name,
          answers: userAnswers,
          health_profile: profilePayload,
        }),
      });

      if (!data?.triage) throw new Error("No triage result was returned");

      if (session?.access_token && data.sessionId) {
        router.push(`/sessions/${data.sessionId}`);
        return;
      }

      setResult(data.triage);
      setStep("results");
    } catch (error) {
      setFlowError(
        error instanceof Error ? error.message : "Failed to analyze symptoms",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep("body-area");
    setSelectedBodyArea(null);
    setSelectedSymptom(null);
    setAnswers({});
    setHealthProfile({
      age: "",
      sex_at_birth: "",
      height_cm: "",
      weight_kg: "",
      chronic_conditions: "",
      medications: "",
      allergies: "",
      diet_prefs: "",
    });
    setResult(null);
    setHealthProfileEdited(false);
    setSaveToProfile(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-[2rem] border border-white/80 bg-white/85 p-6 text-center shadow-xl shadow-blue-950/10 backdrop-blur md:p-8">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <HeartPulse className="h-4 w-4" aria-hidden="true" />
            Guided symptom support
          </div>
          <h1 className="text-4xl font-bold tracking-normal text-gray-950 md:text-5xl">
            Guided symptom check
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-gray-600 md:text-lg">
            Answer a few questions and get educational next-step guidance.
          </p>
          <p className="mx-auto mt-4 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Only share what you are comfortable sharing. You can delete saved
            sessions from your dashboard.
          </p>
        </div>

        {isLoggedIn &&
          hasSavedProfile === false &&
          !profileReminderDismissed && (
            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-900">
              <div className="flex gap-4">
                <div className="flex-1">
                  <h2 className="font-semibold">
                    Complete your profile for better symptom guidance.
                  </h2>
                  <p className="mt-1 text-sm text-blue-700">
                    You can still continue here, or fill it out once in your
                    profile.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileReminderDismissed(true)}
                  className="text-sm font-medium text-blue-700 hover:text-blue-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

        {step !== "results" && (
          <div className="mb-8 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="grid grid-cols-4 gap-2">
              {STEP_LABELS.map(({ key, label }, idx) => {
                const currentIdx = STEP_LABELS.findIndex(
                  (item) => item.key === step,
                );
                const isActive = idx === currentIdx;
                const isComplete = idx < currentIdx;

                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-3 text-center transition ${
                      isActive
                        ? "border-blue-200 bg-blue-50 text-blue-800"
                        : isComplete
                          ? "border-green-200 bg-green-50 text-green-800"
                          : "border-gray-100 bg-white text-gray-500"
                    }`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <div
                      className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : isComplete
                            ? "bg-green-600 text-white"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {isComplete ? "✓" : idx + 1}
                    </div>
                    <span className="text-xs font-semibold md:text-sm">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-2xl shadow-blue-950/10 md:p-8">
          {flowError && (
            <div className="mb-6">
              <ErrorState message={flowError} />
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          )}

          {/* Step 1: Body Area Selection */}
          {step === "body-area" && !loading && (
            <div>
              <h2 className="mb-2 text-2xl font-bold text-gray-950">
                Where are you experiencing symptoms?
              </h2>
              <p className="mb-6 text-gray-600">
                Choose the area that feels most relevant right now.
              </p>

              {bodyAreasError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-700">{bodyAreasError}</p>
                  <button
                    type="button"
                    onClick={loadBodyAreas}
                    className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200"
                  >
                    Retry
                  </button>
                </div>
              ) : bodyAreas.length === 0 ? (
                <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  No symptom categories are available right now.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {bodyAreas.map((area) => (
                    <BodyAreaCard
                      key={area.id}
                      area={area}
                      selected={selectedBodyArea?.id === area.id}
                      onSelect={() => handleBodyAreaSelect(area)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Symptom Selection */}
          {step === "symptom" && !loading && (
            <div>
              <button
                onClick={() => setStep("body-area")}
                className="mb-4 flex items-center rounded-lg px-2 py-1 text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                ← Back
              </button>
              <h2 className="mb-2 text-2xl font-bold text-gray-950">
                What symptom are you experiencing?
              </h2>
              <p className="mb-6 text-gray-600">
                In <strong>{selectedBodyArea?.name}</strong>
              </p>

              <div className="space-y-3">
                {symptoms.length === 0 ? (
                  <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                    No symptoms are available for this body area right now.
                  </p>
                ) : (
                  symptoms.map((symptom) => (
                    <button
                      key={symptom.id}
                      onClick={() => handleSymptomSelect(symptom)}
                      className="w-full rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      <h3 className="text-lg font-semibold text-gray-950">
                        {symptom.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {symptom.description}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 3: Questions */}
          {step === "questions" && !loading && (
            <div>
              <button
                onClick={() => setStep("symptom")}
                className="mb-4 flex items-center rounded-lg px-2 py-1 text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                ← Back
              </button>
              <h2 className="mb-2 text-2xl font-bold text-gray-950">
                Tell us more about your symptoms
              </h2>
              <p className="text-gray-600 mb-6">{selectedSymptom?.name}</p>

              {questions.length === 0 ? (
                <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  No follow-up questions are available for this symptom right
                  now.
                </p>
              ) : (
                <div className="space-y-6">
                  {questions.map((q, idx) => {
                    const options = getQuestionOptions(q);
                    const scaleOptions = getScaleOptions(q);

                    return (
                      <div
                        key={q.id}
                        className="rounded-2xl border border-gray-100 bg-gray-50 p-5"
                      >
                        <label className="block font-semibold text-gray-900 mb-3">
                          {idx + 1}. {q.question_text}{" "}
                          <span className="text-red-500">*</span>
                        </label>

                        {(q.question_type === "single_choice" ||
                          q.question_type === "duration") && (
                          <div className="space-y-2">
                            {options.map((option) => (
                              <label
                                key={option}
                                className="flex cursor-pointer items-center rounded-xl border border-transparent bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50"
                              >
                                <input
                                  type="radio"
                                  name={q.id}
                                  value={option}
                                  checked={answers[q.id] === option}
                                  onChange={(e) =>
                                    setAnswers({
                                      ...answers,
                                      [q.id]: e.target.value,
                                    })
                                  }
                                  className="mr-3 w-4 h-4 text-blue-600"
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {isMultiChoiceQuestion(q) && (
                          <div className="space-y-2">
                            {options.map((option) => (
                              <label
                                key={option}
                                className="flex cursor-pointer items-center rounded-xl border border-transparent bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50"
                              >
                                <input
                                  type="checkbox"
                                  value={option}
                                  checked={(
                                    (answers[q.id] as string[]) || []
                                  ).includes(option)}
                                  onChange={(e) => {
                                    const current =
                                      (answers[q.id] as string[]) || [];
                                    setAnswers({
                                      ...answers,
                                      [q.id]: e.target.checked
                                        ? [...current, option]
                                        : current.filter((v) => v !== option),
                                    });
                                  }}
                                  className="mr-3 w-4 h-4 text-blue-600"
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {q.question_type === "scale" && (
                          <div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-600">
                                {scaleOptions.min}
                              </span>
                              <input
                                type="range"
                                min={scaleOptions.min}
                                max={scaleOptions.max}
                                value={
                                  typeof answers[q.id] === "string"
                                    ? (answers[q.id] as string)
                                    : String(scaleOptions.min)
                                }
                                onChange={(e) =>
                                  setAnswers({
                                    ...answers,
                                    [q.id]: e.target.value,
                                  })
                                }
                                className="flex-1"
                              />
                              <span className="text-sm text-gray-600">
                                {scaleOptions.max}
                              </span>
                              <output className="min-w-8 rounded bg-white px-2 py-1 text-center font-semibold text-gray-900">
                                {typeof answers[q.id] === "string"
                                  ? answers[q.id]
                                  : scaleOptions.min}
                              </output>
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-gray-500">
                              <span>{scaleOptions.minLabel}</span>
                              <span>{scaleOptions.maxLabel}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setStep("health-profile")}
                disabled={questions.length === 0 || !allQuestionsAnswered()}
                className="mt-6 w-full rounded-xl bg-blue-600 py-4 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Health Profile
              </button>

              {!allQuestionsAnswered() && (
                <p className="text-sm text-red-600 text-center mt-2">
                  ⚠️ Please answer all required questions to continue
                </p>
              )}
            </div>
          )}

          {/* Step 4: Health Profile */}
          {step === "health-profile" && !loading && (
            <div>
              <button
                onClick={() => setStep("questions")}
                className="mb-4 flex items-center rounded-lg px-2 py-1 text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                ← Back
              </button>
              <h2 className="mb-2 text-2xl font-bold text-gray-950">
                Health Profile (Optional)
              </h2>
              <p className="mb-6 text-gray-600">
                Add only what feels useful. You can leave this blank.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    value={healthProfile.age}
                    onChange={(e) => updateHealthProfile("age", e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                    placeholder="e.g., 35"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Sex Assigned at Birth
                  </label>
                  <select
                    value={healthProfile.sex_at_birth}
                    onChange={(e) =>
                      updateHealthProfile("sex_at_birth", e.target.value)
                    }
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={healthProfile.height_cm}
                    onChange={(e) =>
                      updateHealthProfile("height_cm", e.target.value)
                    }
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                    placeholder="e.g., 170"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={healthProfile.weight_kg}
                    onChange={(e) =>
                      updateHealthProfile("weight_kg", e.target.value)
                    }
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                    placeholder="e.g., 72"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Chronic Conditions
                  </label>
                  <input
                    type="text"
                    value={healthProfile.chronic_conditions}
                    onChange={(e) =>
                      updateHealthProfile("chronic_conditions", e.target.value)
                    }
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                    placeholder="e.g., Diabetes, Hypertension (comma-separated, or leave blank if none)"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Current Medications
                  </label>
                  <input
                    type="text"
                    value={healthProfile.medications}
                    onChange={(e) =>
                      updateHealthProfile("medications", e.target.value)
                    }
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                    placeholder="e.g., Metformin, Lisinopril (comma-separated, or leave blank if none)"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Allergies
                  </label>
                  <input
                    type="text"
                    value={healthProfile.allergies}
                    onChange={(e) =>
                      updateHealthProfile("allergies", e.target.value)
                    }
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                    placeholder="e.g., Penicillin, Peanuts (comma-separated, or leave blank if none)"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Diet Preferences
                  </label>
                  <input
                    type="text"
                    value={healthProfile.diet_prefs}
                    onChange={(e) =>
                      updateHealthProfile("diet_prefs", e.target.value)
                    }
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                    placeholder="e.g., Vegetarian, Low sodium (comma-separated, or leave blank if none)"
                  />
                </div>
              </div>

              {isLoggedIn && healthProfileEdited && (
                <label className="mt-5 flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={saveToProfile}
                    onChange={(event) => setSaveToProfile(event.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600"
                  />
                  <span>Save this to my profile for next time.</span>
                </label>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-6 w-full bg-green-600 text-white py-4 rounded-xl font-semibold hover:bg-green-700 
                           disabled:opacity-50 transition-colors text-lg"
              >
                {loading ? "Analyzing..." : "Get AI Guidance"}
              </button>
            </div>
          )}

          {/* Step 5: Results */}
          {step === "results" && result && (
            <div>
              <div
                className={`p-6 rounded-xl mb-6 text-white font-bold text-xl
                ${
                  result.triageLevel === "emergency"
                    ? "bg-red-600"
                    : result.triageLevel === "urgent_care"
                      ? "bg-orange-500"
                      : result.triageLevel === "pcp"
                        ? "bg-yellow-500 text-gray-900"
                        : "bg-green-600"
                }`}
              >
                Recommendation:{" "}
                {result.triageLevel.replace(/_/g, " ").toUpperCase()}
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900">
                      AI Confidence
                    </h3>
                    <span className="font-mono text-lg">
                      {result.confidence}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                </div>

                {result.specialtySuggestion && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-900 mb-1">
                      Suggested Specialty
                    </h3>
                    <p className="text-purple-800">
                      {result.specialtySuggestion}
                    </p>
                  </div>
                )}

                {result.redFlags.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h3 className="font-semibold text-red-900 mb-2">
                      ⚠️ Warning Signs Detected
                    </h3>
                    <ul className="list-disc list-inside text-red-800 space-y-1">
                      {result.redFlags.map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Home Care Advice
                  </h3>
                  <p className="text-blue-800">{result.homeCareAdvice}</p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">
                    Doctor Visit Preparation
                  </h3>
                  <p className="text-green-800">
                    {result.doctorVisitPreparationTips}
                  </p>
                </div>
              </div>

              <button
                onClick={resetWizard}
                className="mt-8 w-full bg-gray-800 text-white py-4 rounded-xl font-semibold hover:bg-gray-900 
                           transition-colors"
              >
                Start New Assessment
              </button>
            </div>
          )}
        </div>

        <MedicalDisclaimer className="mx-auto mt-6 max-w-2xl text-center" />
      </div>
    </main>
  );
}

function joinList(value: string[] | null) {
  return value?.join(", ") ?? "";
}

function BodyAreaCard({
  area,
  selected,
  onSelect,
}: {
  area: BodyArea;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = getBodyAreaIcon(area.name);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Choose ${area.name}`}
      className={`group flex min-h-36 w-full items-start gap-4 rounded-2xl border p-5 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        selected
          ? "border-blue-400 bg-blue-50 shadow-blue-100"
          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
      }`}
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition ${
          selected
            ? "bg-blue-600 text-white"
            : "bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white"
        }`}
        aria-hidden="true"
      >
        <Icon className="h-7 w-7" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-lg font-semibold text-gray-950">
          {area.name}
          {selected && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
              Selected
            </span>
          )}
        </span>
        <span className="mt-2 block text-sm leading-6 text-gray-600">
          {area.description}
        </span>
      </span>
    </button>
  );
}

function getBodyAreaIcon(name: string): LucideIcon {
  const normalized = name.toLowerCase();

  if (normalized.includes("chest") || normalized.includes("breathing")) {
    return Wind;
  }
  if (normalized.includes("head") || normalized.includes("neck")) {
    return Brain;
  }
  if (normalized.includes("abdomen") || normalized.includes("digestion")) {
    return Apple;
  }
  if (normalized.includes("back") || normalized.includes("spine")) {
    return Bone;
  }
  if (
    normalized.includes("arms") ||
    normalized.includes("legs") ||
    normalized.includes("joints")
  ) {
    return Dumbbell;
  }
  if (normalized.includes("skin") || normalized.includes("wounds")) {
    return Bandage;
  }
  if (normalized.includes("urinary") || normalized.includes("pelvic")) {
    return Droplets;
  }
  if (normalized.includes("mental") || normalized.includes("sleep")) {
    return Moon;
  }
  if (normalized.includes("general") || normalized.includes("whole body")) {
    return HeartPulse;
  }

  return Activity;
}

function isMultiChoiceQuestion(question: SymptomQuestion) {
  return (
    question.question_type === "multiple_choice" ||
    question.question_type === "multi_choice"
  );
}

function getQuestionOptions(question: SymptomQuestion) {
  return Array.isArray(question.options) ? question.options : [];
}

function getScaleOptions(question: SymptomQuestion) {
  if (Array.isArray(question.options)) {
    return {
      min: 0,
      max: 10,
      minLabel: "Low",
      maxLabel: "High",
    };
  }

  return {
    min: question.options.min ?? 0,
    max: question.options.max ?? 10,
    minLabel: question.options.minLabel ?? "Low",
    maxLabel: question.options.maxLabel ?? "High",
  };
}

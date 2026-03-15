"use client";
import { useState, useEffect } from "react";

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
  question_type: "single_choice" | "multiple_choice";
  options: string[];
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

type Step =
  | "body-area"
  | "symptom"
  | "questions"
  | "health-profile"
  | "results";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function SymptomChecker() {
  const [step, setStep] = useState<Step>("body-area");
  const [bodyAreas, setBodyAreas] = useState<BodyArea[]>([]);
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
    chronic_conditions: "",
    medications: "",
    allergies: "",
  });

  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch body areas on mount
  useEffect(() => {
    fetch(`${API_URL}/symptom-sessions/body-areas`)
      .then((res) => res.json())
      .then(setBodyAreas)
      .catch(console.error);
  }, []);

  // Fetch symptoms when body area selected
  const handleBodyAreaSelect = async (area: BodyArea) => {
    setSelectedBodyArea(area);
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/symptom-sessions/symptom-categories/${area.id}`,
      );
      const data = await res.json();
      setSymptoms(data);
      setStep("symptom");
    } catch (error) {
      console.error(error);
      alert("Failed to load symptoms");
    } finally {
      setLoading(false);
    }
  };

  // Fetch questions when symptom selected
  const handleSymptomSelect = async (symptom: SymptomCategory) => {
    setSelectedSymptom(symptom);
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/symptom-sessions/symptom-questions/${symptom.id}`,
      );
      const data = await res.json();
      setQuestions(data);
      setStep("questions");
    } catch (error) {
      console.error(error);
      alert("Failed to load questions");
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
    try {
      const userAnswers: UserAnswer[] = questions.map((q) => ({
        question_id: q.id,
        question_text: q.question_text,
        answer:
          answers[q.id] || (q.question_type === "multiple_choice" ? [] : ""),
      }));

      // Helper to parse comma-separated values
      const parseList = (value: string): string[] => {
        if (!value || !value.trim()) return [];
        return value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      };

      const res = await fetch(`${API_URL}/symptom-sessions/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body_area_id: selectedBodyArea.id,
          body_area_name: selectedBodyArea.name,
          symptom_category_id: selectedSymptom.id,
          symptom_name: selectedSymptom.name,
          answers: userAnswers,
          health_profile: {
            age: healthProfile.age ? parseInt(healthProfile.age) : undefined,
            sex_at_birth: healthProfile.sex_at_birth || undefined,
            chronic_conditions: parseList(healthProfile.chronic_conditions),
            medications: parseList(healthProfile.medications),
            allergies: parseList(healthProfile.allergies),
          },
        }),
      });

      const data = await res.json();
      setResult(data.triage);
      setStep("results");
    } catch (error) {
      console.error(error);
      alert("Failed to analyze symptoms");
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
      chronic_conditions: "",
      medications: "",
      allergies: "",
    });
    setResult(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            VitaScan AI Triage
          </h1>
          <p className="text-gray-600">
            Intelligent symptom assessment powered by AI
          </p>
        </div>

        {/* Progress Bar */}
        {step !== "results" && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              {["Body Area", "Symptom", "Questions", "Health Info"].map(
                (label, idx) => {
                  const steps: Step[] = [
                    "body-area",
                    "symptom",
                    "questions",
                    "health-profile",
                  ];
                  const currentIdx = steps.indexOf(step);
                  const isActive = idx === currentIdx;
                  const isComplete = idx < currentIdx;

                  return (
                    <div key={label} className="flex items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                      ${isComplete ? "bg-green-500 text-white" : isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}
                      >
                        {isComplete ? "✓" : idx + 1}
                      </div>
                      <span
                        className={`ml-2 text-sm hidden md:inline ${isActive ? "font-semibold text-blue-600" : "text-gray-500"}`}
                      >
                        {label}
                      </span>
                      {idx < 3 && (
                        <div
                          className={`flex-1 h-1 mx-2 ${isComplete ? "bg-green-500" : "bg-gray-200"}`}
                        />
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          )}

          {/* Step 1: Body Area Selection */}
          {step === "body-area" && !loading && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Where are you experiencing symptoms?
              </h2>
              <p className="text-gray-600 mb-6">
                Select the area of your body that&apos;s affected
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bodyAreas.map((area) => (
                  <button
                    key={area.id}
                    onClick={() => handleBodyAreaSelect(area)}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 
                               transition-all text-left group"
                  >
                    <div className="flex items-start">
                      <span className="text-4xl mr-4">{area.icon}</span>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600">
                          {area.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {area.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Symptom Selection */}
          {step === "symptom" && !loading && (
            <div>
              <button
                onClick={() => setStep("body-area")}
                className="text-blue-600 mb-4 flex items-center hover:text-blue-700"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What symptom are you experiencing?
              </h2>
              <p className="text-gray-600 mb-6">
                In <strong>{selectedBodyArea?.name}</strong>
              </p>

              <div className="space-y-3">
                {symptoms.map((symptom) => (
                  <button
                    key={symptom.id}
                    onClick={() => handleSymptomSelect(symptom)}
                    className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 
                               transition-all text-left"
                  >
                    <h3 className="font-semibold text-lg text-gray-900">
                      {symptom.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {symptom.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Questions */}
          {step === "questions" && !loading && (
            <div>
              <button
                onClick={() => setStep("symptom")}
                className="text-blue-600 mb-4 flex items-center hover:text-blue-700"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Tell us more about your symptoms
              </h2>
              <p className="text-gray-600 mb-6">{selectedSymptom?.name}</p>

              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-5 bg-gray-50 rounded-xl">
                    <label className="block font-semibold text-gray-900 mb-3">
                      {idx + 1}. {q.question_text}{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    {q.question_type === "single_choice" && (
                      <div className="space-y-2">
                        {q.options.map((option) => (
                          <label
                            key={option}
                            className="flex items-center p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 border-2 border-transparent hover:border-blue-300"
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

                    {q.question_type === "multiple_choice" && (
                      <div className="space-y-2">
                        {q.options.map((option) => (
                          <label
                            key={option}
                            className="flex items-center p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 border-2 border-transparent hover:border-blue-300"
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
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep("health-profile")}
                disabled={!allQuestionsAnswered()}
                className="mt-6 w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                className="text-blue-600 mb-4 flex items-center hover:text-blue-700"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Health Profile (Optional)
              </h2>
              <p className="text-gray-600 mb-6">
                This helps us provide more accurate recommendations
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    value={healthProfile.age}
                    onChange={(e) =>
                      setHealthProfile({
                        ...healthProfile,
                        age: e.target.value,
                      })
                    }
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
                      setHealthProfile({
                        ...healthProfile,
                        sex_at_birth: e.target.value,
                      })
                    }
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Chronic Conditions
                  </label>
                  <input
                    type="text"
                    value={healthProfile.chronic_conditions}
                    onChange={(e) =>
                      setHealthProfile({
                        ...healthProfile,
                        chronic_conditions: e.target.value,
                      })
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
                      setHealthProfile({
                        ...healthProfile,
                        medications: e.target.value,
                      })
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
                      setHealthProfile({
                        ...healthProfile,
                        allergies: e.target.value,
                      })
                    }
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                    placeholder="e.g., Penicillin, Peanuts (comma-separated, or leave blank if none)"
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-6 w-full bg-green-600 text-white py-4 rounded-xl font-semibold hover:bg-green-700 
                           disabled:opacity-50 transition-colors text-lg"
              >
                {loading ? "Analyzing..." : "Get AI Diagnosis"}
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

        {/* Disclaimer */}
        <p className="text-center text-sm text-gray-500 mt-6 max-w-2xl mx-auto">
          ⚠️ <strong>Medical Disclaimer:</strong> This tool provides
          informational guidance only and is not a substitute for professional
          medical advice, diagnosis, or treatment. Always consult a qualified
          healthcare provider for medical concerns.
        </p>
      </div>
    </main>
  );
}

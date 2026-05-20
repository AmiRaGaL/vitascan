"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ErrorState } from "@/components/ErrorState";
import { useUser } from "@/hooks/useUser";
import { ApiError, apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface ProfileForm {
  age: string;
  sex_at_birth: string;
  height_cm: string;
  weight_kg: string;
  chronic_conditions: string;
  medications: string;
  allergies: string;
  diet_prefs: string;
}

interface HealthProfile {
  age: number | null;
  sex_at_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  chronic_conditions: string[] | null;
  medications: string[] | null;
  allergies: string[] | null;
  diet_prefs: string[] | null;
}


const emptyForm: ProfileForm = {
  age: "",
  sex_at_birth: "",
  height_cm: "",
  weight_kg: "",
  chronic_conditions: "",
  medications: "",
  allergies: "",
  diet_prefs: "",
};

export default function ProfilePage() {
  const router = useRouter();
  const { isGuest, loading } = useUser();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isGuest) router.push("/");
  }, [loading, isGuest, router]);

  useEffect(() => {
    if (loading || isGuest) return;

    const loadProfile = async () => {
      setProfileLoading(true);
      setError(null);

      try {
        const token = await getAccessToken();
        if (!token) {
          router.push("/");
          return;
        }

        const profile = await apiFetch<HealthProfile | null>("/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!profile) return;

        setForm({
          age: profile.age?.toString() ?? "",
          sex_at_birth: profile.sex_at_birth ?? "",
          height_cm: profile.height_cm?.toString() ?? "",
          weight_kg: profile.weight_kg?.toString() ?? "",
          chronic_conditions: joinList(profile.chronic_conditions),
          medications: joinList(profile.medications),
          allergies: joinList(profile.allergies),
          diet_prefs: joinList(profile.diet_prefs),
        });
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) {
          router.push("/");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [loading, isGuest, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.push("/");
        return;
      }

      await apiFetch<HealthProfile>("/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          age: parseOptionalNumber(form.age),
          sex_at_birth: form.sex_at_birth || null,
          height_cm: parseOptionalNumber(form.height_cm),
          weight_kg: parseOptionalNumber(form.weight_kg),
          chronic_conditions: parseList(form.chronic_conditions),
          medications: parseList(form.medications),
          allergies: parseList(form.allergies),
          diet_prefs: parseList(form.diet_prefs),
        }),
      });

      setMessage("Profile saved. Future symptom checks can use this context.");
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        router.push("/");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isGuest) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
        Back to dashboard
      </Link>

      <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-2 text-gray-500">
          Keep your health context current for future symptom checks.
        </p>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Only share information you&apos;re comfortable saving. You can delete
          saved sessions from your dashboard.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Age"
              type="number"
              value={form.age}
              onChange={(value) => setForm({ ...form, age: value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sex assigned at birth
              </label>
              <select
                value={form.sex_at_birth}
                onChange={(event) =>
                  setForm({ ...form, sex_at_birth: event.target.value })
                }
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Used only to tailor general symptom guidance.
              </p>
            </div>
            <Field
              label="Height (cm)"
              type="number"
              value={form.height_cm}
              onChange={(value) => setForm({ ...form, height_cm: value })}
            />
            <Field
              label="Weight (kg)"
              type="number"
              value={form.weight_kg}
              onChange={(value) => setForm({ ...form, weight_kg: value })}
            />
          </div>

          <Field
            label="Chronic conditions"
            value={form.chronic_conditions}
            onChange={(value) =>
              setForm({ ...form, chronic_conditions: value })
            }
            placeholder="Diabetes, Hypertension"
            helperText="Separate items with commas. Enter None or leave blank if this does not apply."
          />
          <Field
            label="Medications"
            value={form.medications}
            onChange={(value) => setForm({ ...form, medications: value })}
            placeholder="Metformin, Lisinopril"
            helperText="Separate items with commas. Enter None or leave blank if you do not take medications."
          />
          <Field
            label="Allergies"
            value={form.allergies}
            onChange={(value) => setForm({ ...form, allergies: value })}
            placeholder="Penicillin, Peanuts"
            helperText="Separate items with commas. Enter None or leave blank if you have no known allergies."
          />
          <Field
            label="Diet preferences"
            value={form.diet_prefs}
            onChange={(value) => setForm({ ...form, diet_prefs: value })}
            placeholder="Vegetarian, Low sodium"
            helperText="Separate items with commas. Enter None or leave blank if you have no preferences."
          />

          {message && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {message}
            </div>
          )}
          {error && (
            <ErrorState message={error} />
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  helperText?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
      />
      {helperText && <p className="mt-1 text-xs text-gray-400">{helperText}</p>}
    </div>
  );
}

async function getAccessToken() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function parseList(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "none" || normalized === "prefer not to say") return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value: string[] | null) {
  return value?.join(", ") ?? "";
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

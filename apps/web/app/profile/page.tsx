"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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
        const res = await fetch(`${API_URL}/profile`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) throw new Error("Failed to load profile");

        const profile = (await res.json()) as HealthProfile | null;
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
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [loading, isGuest]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to save profile");

      setMessage("Profile saved. Future symptom checks can use this context.");
    } catch (err) {
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
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
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
          />
          <Field
            label="Medications"
            value={form.medications}
            onChange={(value) => setForm({ ...form, medications: value })}
            placeholder="Metformin, Lisinopril"
          />
          <Field
            label="Allergies"
            value={form.allergies}
            onChange={(value) => setForm({ ...form, allergies: value })}
            placeholder="Penicillin, Peanuts"
          />
          <Field
            label="Diet preferences"
            value={form.diet_prefs}
            onChange={(value) => setForm({ ...form, diet_prefs: value })}
            placeholder="Vegetarian, Low sodium"
          />

          {message && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
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

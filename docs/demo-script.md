# VitaScan MVP Demo Script

Use this as a 2-3 minute walkthrough for portfolio reviews, recorded demos, or live project discussions.

## 1. Problem

"VitaScan is an educational symptom triage MVP for people who are unsure what to do next when they notice symptoms. The goal is not to diagnose, but to help users organize symptoms, understand red flags, and decide whether home care, primary care, urgent care, or emergency care may be appropriate."

## 2. Login and Profile

"I will log in with Google through Supabase Auth and land on the dashboard. From there, I can create or update a basic health profile with age, sex assigned at birth, medications, allergies, chronic conditions, and diet preferences. The app also reminds users to only save information they are comfortable sharing."

## 3. Symptom Check

"Next I will start a symptom check. The flow asks for a body area, symptom category, guided answers, and optional profile context. The API applies usage limits, retrieves relevant knowledge-base context, asks the AI provider for structured educational guidance, and then applies rule-based red-flag overrides."

## 4. Saved Session

"Because I am logged in, the result is saved. I can open the session detail page to review the recommended level of care, red-flag guidance, summary, answers, and profile snapshot. I can also copy, print, or delete the session."

## 5. Recipes and Chat

"For saved sessions, VitaScan can show wellness recipe suggestions when relevant. It also includes post-triage chat, where the user can ask follow-up questions about the saved session. Chat responses use the saved session and retrieved knowledge-base context, while staying educational."

## 6. Safety Guardrails

"The safety model is explicit: VitaScan is educational only and does not provide a diagnosis, prescription, or replacement for medical care. Severe, sudden, or worsening symptoms surface emergency guidance and tell users to contact local emergency services."

## 7. Technical Stack

"The frontend is built with Next.js App Router, React, and Tailwind CSS. The backend is a NestJS API in TypeScript. Supabase handles Google auth, Postgres storage, and row-level security. Groq powers AI responses, and pgvector supports lightweight RAG grounding. The monorepo uses pnpm workspaces."

## 8. Future Work

"Future work would include mobile, clinical validation, stronger compliance and audit workflows, deeper RAG validation and citations, monitoring improvements, and premium limits or billing if the product direction needs it."

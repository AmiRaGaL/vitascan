import json
from typing import Any

from pydantic import ValidationError

from app.agents.red_flag import RedFlagResult
from app.prompts.triage_decision import JSON_REPAIR_PROMPT, SYSTEM_PROMPT
from app.schemas.symptom import NormalizedSymptoms
from app.schemas.triage import HealthProfile, TriageDecision
from app.services.groq_client import GroqClient, get_groq_client


SERIOUS_TERMS = [
    "chest pain",
    "shortness of breath",
    "trouble breathing",
    "slurred speech",
    "weakness",
    "severe",
    "sudden",
    "fainting",
]


async def decide_triage(
    normalized: NormalizedSymptoms,
    health_profile: HealthProfile,
    retrieved_chunks: list[dict],
    red_flags: RedFlagResult,
    groq_client: GroqClient | None = None,
) -> TriageDecision:
    if red_flags.triage == "emergency":
        return TriageDecision(
            triage_level="emergency",
            confidence=0.95,
            reasoning=["Emergency red-flag symptoms were detected."],
            evidence_ids=[],
            follow_up_questions=[],
            safety_override_applied=True,
        )

    client = groq_client if groq_client is not None else get_groq_client()
    if client is None:
        return fallback_decision(normalized, reason="Groq API key is not configured.")

    messages = build_messages(normalized, health_profile, retrieved_chunks)
    try:
        result = await client.chat(messages)
        decision = parse_decision(result.content)
    except (ValidationError, json.JSONDecodeError, ValueError):
        decision = await repair_or_fallback(client, messages, normalized)
    except Exception:
        decision = fallback_decision(normalized, reason="Groq triage call failed.")

    if red_flags.triage == "emergency" and decision.triage_level != "emergency":
        return force_emergency(decision)

    return prevent_unsafe_home_care(decision, normalized)


def build_messages(
    normalized: NormalizedSymptoms,
    health_profile: HealthProfile,
    retrieved_chunks: list[dict],
) -> list[dict]:
    evidence = [
        {
            "id": str(chunk.get("id") or index),
            "title": chunk.get("title"),
            "source": chunk.get("source"),
            "text": chunk.get("chunk_text"),
        }
        for index, chunk in enumerate(retrieved_chunks)
    ]
    user_payload: dict[str, Any] = {
        "symptoms": normalized.model_dump(),
        "health_profile": health_profile.model_dump(),
        "retrieved_evidence": evidence,
    }

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps(user_payload)},
    ]


def parse_decision(content: str) -> TriageDecision:
    return TriageDecision.model_validate(json.loads(content))


async def repair_or_fallback(
    client: GroqClient,
    messages: list[dict],
    normalized: NormalizedSymptoms,
) -> TriageDecision:
    repair_messages = [
        *messages,
        {"role": "assistant", "content": "The previous response was malformed."},
        {"role": "user", "content": JSON_REPAIR_PROMPT},
    ]
    try:
        result = await client.chat(repair_messages)
        return prevent_unsafe_home_care(parse_decision(result.content), normalized)
    except Exception:
        return fallback_decision(normalized, reason="Groq JSON repair failed.")


def fallback_decision(normalized: NormalizedSymptoms, reason: str) -> TriageDecision:
    serious_or_uncertain = has_serious_terms(normalized) or not normalized.severity
    return TriageDecision(
        triage_level="urgent_care" if serious_or_uncertain else "primary_care",
        confidence=0.45,
        reasoning=[reason, "Using conservative fallback triage guidance."],
        evidence_ids=[],
        follow_up_questions=[],
        safety_override_applied=False,
    )


def prevent_unsafe_home_care(
    decision: TriageDecision,
    normalized: NormalizedSymptoms,
) -> TriageDecision:
    if decision.triage_level == "home_care" and (
        has_serious_terms(normalized) or decision.confidence < 0.6
    ):
        return decision.model_copy(
            update={
                "triage_level": "primary_care",
                "reasoning": [
                    *decision.reasoning,
                    "Home care was not used because symptoms or uncertainty require more caution.",
                ],
            }
        )

    return decision


def force_emergency(decision: TriageDecision) -> TriageDecision:
    return decision.model_copy(
        update={
            "triage_level": "emergency",
            "confidence": max(decision.confidence, 0.95),
            "safety_override_applied": True,
            "follow_up_questions": [],
            "reasoning": [
                *decision.reasoning,
                "Emergency safety override cannot be downgraded.",
            ],
        }
    )


def has_serious_terms(normalized: NormalizedSymptoms) -> bool:
    raw_text = normalized.raw_text.lower()
    return any(term in raw_text for term in SERIOUS_TERMS)

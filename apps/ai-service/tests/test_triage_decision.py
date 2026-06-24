import json
import os
import unittest

os.environ["AI_SERVICE_TOKEN"] = "test-token"

from app.agents.red_flag import RedFlagResult
from app.agents.symptom_intake import normalize_symptoms
from app.agents.triage_decision import decide_triage
from app.config import get_settings
from app.schemas.triage import HealthProfile
from app.services.groq_client import GroqChatResult


class FakeGroqClient:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []
        self.model = "test-groq-model"

    async def chat(self, messages, temperature=0.1):
        self.calls.append(messages)
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return GroqChatResult(content=response, token_metadata={"total_tokens": 42})


class TriageDecisionTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        get_settings.cache_clear()

    async def test_valid_groq_json_parses(self):
        client = FakeGroqClient(
            [
                json.dumps(
                    {
                        "triage_level": "primary_care",
                        "confidence": 0.82,
                        "reasoning": ["Symptoms are mild but persistent."],
                        "evidence_ids": ["0"],
                        "follow_up_questions": ["How long has this been happening?"],
                        "safety_override_applied": False,
                    }
                )
            ]
        )

        decision = await decide_triage(
            normalized=normalize_symptoms("mild headache for one day"),
            health_profile=HealthProfile(age=34),
            retrieved_chunks=[{"id": "0", "chunk_text": "Headache guidance"}],
            red_flags=RedFlagResult(),
            groq_client=client,
        )

        self.assertEqual(decision.triage_level, "primary_care")
        self.assertEqual(decision.confidence, 0.82)
        self.assertEqual(decision.evidence_ids, ["0"])
        self.assertEqual(len(client.calls), 1)

    async def test_malformed_json_triggers_repair(self):
        client = FakeGroqClient(
            [
                "not json",
                json.dumps(
                    {
                        "triage_level": "urgent_care",
                        "confidence": 0.7,
                        "reasoning": ["Repair succeeded."],
                        "evidence_ids": [],
                        "follow_up_questions": [],
                        "safety_override_applied": False,
                    }
                ),
            ]
        )

        decision = await decide_triage(
            normalized=normalize_symptoms("moderate cough"),
            health_profile=HealthProfile(),
            retrieved_chunks=[],
            red_flags=RedFlagResult(),
            groq_client=client,
        )

        self.assertEqual(decision.triage_level, "urgent_care")
        self.assertEqual(len(client.calls), 2)

    async def test_malformed_json_repair_failure_falls_back(self):
        client = FakeGroqClient(["not json", "still not json"])

        decision = await decide_triage(
            normalized=normalize_symptoms("severe headache"),
            health_profile=HealthProfile(),
            retrieved_chunks=[],
            red_flags=RedFlagResult(),
            groq_client=client,
        )

        self.assertEqual(decision.triage_level, "urgent_care")
        self.assertEqual(decision.confidence, 0.45)
        self.assertEqual(len(client.calls), 2)

    async def test_safety_override_cannot_be_downgraded(self):
        client = FakeGroqClient(
            [
                json.dumps(
                    {
                        "triage_level": "home_care",
                        "confidence": 0.9,
                        "reasoning": ["Incorrect downgrade."],
                        "evidence_ids": [],
                        "follow_up_questions": [],
                        "safety_override_applied": False,
                    }
                )
            ]
        )

        decision = await decide_triage(
            normalized=normalize_symptoms("chest pain and sweating"),
            health_profile=HealthProfile(),
            retrieved_chunks=[],
            red_flags=RedFlagResult(
                matched=True,
                triage="emergency",
                matched_rules=["cardiac_emergency"],
                matched_terms=["chest pain", "sweating"],
            ),
            groq_client=client,
        )

        self.assertEqual(decision.triage_level, "emergency")
        self.assertTrue(decision.safety_override_applied)
        self.assertEqual(client.calls, [])

    async def test_missing_groq_api_key_uses_fallback(self):
        os.environ.pop("GROQ_API_KEY", None)
        get_settings.cache_clear()

        decision = await decide_triage(
            normalized=normalize_symptoms("mild headache for one day"),
            health_profile=HealthProfile(),
            retrieved_chunks=[],
            red_flags=RedFlagResult(),
        )

        self.assertEqual(decision.triage_level, "primary_care")
        self.assertEqual(decision.confidence, 0.45)

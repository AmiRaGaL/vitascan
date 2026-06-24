import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

os.environ["AI_SERVICE_TOKEN"] = "test-token"
os.environ.pop("GROQ_API_KEY", None)

from app.config import get_settings
from app.main import app


client = TestClient(app)


class TriageRouteTest(unittest.TestCase):
    def setUp(self) -> None:
        get_settings.cache_clear()

    def payload(self):
        return {
            "user_id": None,
            "session_id": "session-123",
            "message": "I have a headache",
            "health_profile": {
                "age": 34,
                "sex": None,
                "conditions": [],
                "medications": [],
                "allergies": [],
            },
        }

    def authorized_post(self, message: str):
        payload = self.payload()
        payload["message"] = message
        return client.post(
            "/triage/run",
            json=payload,
            headers={"x-service-token": "test-token"},
        )

    def test_triage_without_token_returns_401(self):
        response = client.post("/triage/run", json=self.payload())

        self.assertEqual(response.status_code, 401)

    def test_triage_with_token_returns_fallback_response(self):
        response = client.post(
            "/triage/run",
            json=self.payload(),
            headers={"x-service-token": "test-token"},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["triage_level"], "urgent_care")
        self.assertEqual(body["confidence"], 0.45)
        self.assertEqual(body["citations"], [])
        self.assertEqual(body["follow_up_questions"], [])
        self.assertFalse(body["safety_override_applied"])
        self.assertEqual(body["trace_id"], "mock_trace_session-123")
        self.assertIn("educational triage guidance", body["response"])

    def test_chest_pain_and_sweating_returns_emergency_override(self):
        response = self.authorized_post("I have chest pain and sweating.")

        self.assert_emergency_override(response)

    def test_slurred_speech_and_one_side_weakness_returns_emergency_override(self):
        response = self.authorized_post(
            "There is slurred speech and one side weakness."
        )

        self.assert_emergency_override(response)

    def test_hives_and_trouble_breathing_returns_emergency_override(self):
        response = self.authorized_post("I have hives and trouble breathing.")

        self.assert_emergency_override(response)

    def test_mild_headache_for_one_day_returns_no_emergency_override(self):
        response = self.authorized_post("I have a mild headache for one day.")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["triage_level"], "primary_care")
        self.assertEqual(response.json()["confidence"], 0.45)
        self.assertFalse(response.json()["safety_override_applied"])

    def test_retrieval_failure_keeps_triage_response_safe(self):
        with patch(
            "app.routes.triage.retrieve_medical_chunks",
            side_effect=RuntimeError("retrieval unavailable"),
        ):
            response = self.authorized_post("I have a mild headache for one day.")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["citations"], [])
        self.assertFalse(response.json()["safety_override_applied"])

    def test_trace_logger_called_on_successful_triage(self):
        with patch("app.routes.triage.log_trace") as log_trace:
            response = self.authorized_post("I have a mild headache for one day.")

        self.assertEqual(response.status_code, 200)
        log_trace.assert_called_once()
        metadata = log_trace.call_args.args[0]
        self.assertEqual(metadata.trace_id, "mock_trace_session-123")
        self.assertEqual(metadata.session_id, "session-123")
        self.assertEqual(metadata.request_text, "I have a mild headache for one day.")
        self.assertIn("chief_complaint", metadata.normalized_symptoms)
        self.assertNotIn("raw_text", metadata.normalized_symptoms)
        self.assertIn("matched", metadata.red_flags)
        self.assertIn("triage_level", metadata.triage_decision)
        self.assertIsInstance(metadata.latency_ms, int)

    def test_trace_failure_does_not_break_triage(self):
        with patch(
            "app.routes.triage.log_trace",
            side_effect=RuntimeError("trace unavailable"),
        ):
            response = self.authorized_post("I have a mild headache for one day.")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["trace_id"], "mock_trace_session-123")

    def assert_emergency_override(self, response):
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["triage_level"], "emergency")
        self.assertEqual(body["confidence"], 0.95)
        self.assertTrue(body["safety_override_applied"])
        self.assertEqual(body["follow_up_questions"], [])
        self.assertIn("medical emergency", body["response"])
        self.assertIn("seek immediate care", body["response"])

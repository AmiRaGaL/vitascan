import os
import unittest

from fastapi.testclient import TestClient

os.environ["AI_SERVICE_TOKEN"] = "test-token"

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

    def test_triage_with_token_returns_mock_response(self):
        response = client.post(
            "/triage/run",
            json=self.payload(),
            headers={"x-service-token": "test-token"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "triage_level": "primary_care",
                "confidence": 0.5,
                "response": "Mock triage response...",
                "citations": [],
                "follow_up_questions": [],
                "safety_override_applied": False,
                "trace_id": "mock_trace_session-123",
            },
        )

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
        self.assertEqual(response.json()["confidence"], 0.5)
        self.assertFalse(response.json()["safety_override_applied"])

    def assert_emergency_override(self, response):
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["triage_level"], "emergency")
        self.assertEqual(body["confidence"], 0.95)
        self.assertTrue(body["safety_override_applied"])
        self.assertEqual(body["follow_up_questions"], [])
        self.assertIn("medical emergency", body["response"])
        self.assertIn("seek immediate care", body["response"])

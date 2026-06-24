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

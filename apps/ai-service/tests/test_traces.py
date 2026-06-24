import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

os.environ["AI_SERVICE_TOKEN"] = "test-token"

from app.config import get_settings
from app.main import app


client = TestClient(app)


class TracesRouteTest(unittest.TestCase):
    def setUp(self) -> None:
        get_settings.cache_clear()

    def test_traces_requires_service_token(self):
        response = client.get("/traces/session-123")

        self.assertEqual(response.status_code, 401)

    def test_traces_returns_session_trace_logs_with_token(self):
        with patch("app.routes.traces.get_traces_for_session") as get_traces:
            get_traces.return_value = [
                {
                    "trace_id": "mock_trace_session-123",
                    "session_id": "session-123",
                    "user_id": None,
                    "event_type": "triage_run",
                    "payload": {"latency_ms": 12},
                    "created_at": "2026-01-01T00:00:00Z",
                }
            ]

            response = client.get(
                "/traces/session-123",
                headers={"x-service-token": "test-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["trace_id"], "mock_trace_session-123")
        get_traces.assert_called_once_with("session-123")

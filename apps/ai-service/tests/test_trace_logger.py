import unittest

from app.schemas.trace import TraceLogCreate
from app.services.trace_logger import log_trace, sanitize_payload


class FakeSupabaseClient:
    def __init__(self, should_fail=False):
        self.should_fail = should_fail
        self.insert_calls = []

    def insert(self, table_name: str, row: dict):
        if self.should_fail:
            raise RuntimeError("insert failed")
        self.insert_calls.append((table_name, row))


class TraceLoggerTest(unittest.TestCase):
    def metadata(self):
        return TraceLogCreate(
            trace_id="mock_trace_session-123",
            session_id="session-123",
            user_id=None,
            request_text="I have a mild headache.",
            latency_ms=12,
            normalized_symptoms={"chief_complaint": "i have a mild headache"},
            red_flags={"matched": False},
            retrieved_chunks=[],
            triage_decision={"triage_level": "primary_care"},
            model_name=None,
            token_metadata={},
            validation_passed=False,
            fallback_used=True,
        )

    def test_log_trace_inserts_sanitized_payload(self):
        client = FakeSupabaseClient()

        result = log_trace(self.metadata(), supabase_client=client)

        self.assertTrue(result)
        self.assertEqual(client.insert_calls[0][0], "ai_trace_logs")
        row = client.insert_calls[0][1]
        self.assertEqual(row["trace_id"], "mock_trace_session-123")
        self.assertEqual(row["event_type"], "triage_run")
        self.assertEqual(row["payload"]["request_text"], "I have a mild headache.")

    def test_log_trace_failure_returns_false(self):
        client = FakeSupabaseClient(should_fail=True)

        result = log_trace(self.metadata(), supabase_client=client)

        self.assertFalse(result)

    def test_sanitize_payload_removes_secret_keys(self):
        sanitized = sanitize_payload(
            {
                "request_text": "hello",
                "GROQ_API_KEY": "secret",
                "nested": {"x-service-token": "secret", "ok": True},
            }
        )

        self.assertEqual(sanitized, {"request_text": "hello", "nested": {"ok": True}})

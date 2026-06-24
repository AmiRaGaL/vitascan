import unittest

from app.agents.retrieval import retrieve_medical_chunks


class FakeSupabaseClient:
    def __init__(self, result=None):
        self.result = result or []
        self.calls = []

    def rpc(self, function_name: str, payload: dict):
        self.calls.append((function_name, payload))
        return self.result


class RetrievalTest(unittest.TestCase):
    def test_returns_empty_when_embedding_is_unavailable(self):
        client = FakeSupabaseClient(result=[{"title": "Unused"}])

        result = retrieve_medical_chunks("headache", [], supabase_client=client)

        self.assertEqual(result, [])
        self.assertEqual(client.calls, [])

    def test_calls_match_rpc_with_mocked_supabase_client(self):
        expected = [
            {
                "title": "Trusted source",
                "source": "clinical-reference",
                "chunk_text": "Seek care for severe symptoms.",
                "metadata": {},
                "similarity": 0.91,
            }
        ]
        client = FakeSupabaseClient(result=expected)
        embedding = [0.1] * 384

        result = retrieve_medical_chunks(
            "severe symptoms",
            embedding,
            match_count=3,
            supabase_client=client,
        )

        self.assertEqual(result, expected)
        self.assertEqual(
            client.calls,
            [
                (
                    "match_medical_chunks",
                    {"query_embedding": embedding, "match_count": 3},
                )
            ],
        )

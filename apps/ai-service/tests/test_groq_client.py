import unittest
from unittest.mock import patch

import httpx

from app.services.groq_client import GroqClient, GroqRateLimitError


class FakeAsyncClient:
    post_count = 0

    def __init__(self, timeout):
        self.timeout = timeout

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return False

    async def post(self, *args, **kwargs):
        FakeAsyncClient.post_count += 1
        return httpx.Response(
            429,
            request=httpx.Request("POST", "https://api.groq.com"),
        )


class GroqClientTest(unittest.IsolatedAsyncioTestCase):
    async def test_exhausted_429_retries_raise_rate_limit_error(self):
        sleeps = []

        async def fake_sleep(seconds):
            sleeps.append(seconds)

        FakeAsyncClient.post_count = 0
        client = GroqClient(api_key="test", model="test-model")

        with (
            patch("app.services.groq_client.httpx.AsyncClient", FakeAsyncClient),
            patch("app.services.groq_client.asyncio.sleep", side_effect=fake_sleep),
        ):
            with self.assertRaises(GroqRateLimitError):
                await client.chat(messages=[{"role": "user", "content": "hello"}])

        self.assertEqual(FakeAsyncClient.post_count, 3)
        self.assertEqual(sleeps, [2.0, 4.0])

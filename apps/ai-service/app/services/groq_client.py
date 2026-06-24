import asyncio
from dataclasses import dataclass
from email.utils import parsedate_to_datetime
from time import time

import httpx

from app.config import get_settings


@dataclass
class GroqChatResult:
    content: str
    token_metadata: dict


class GroqClient:
    def __init__(
        self,
        api_key: str,
        model: str,
        timeout_seconds: float = 25.0,
        max_retries: int = 2,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries

    async def chat(self, messages: list[dict], temperature: float = 0.1) -> GroqChatResult:
        last_error: Exception | None = None

        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "authorization": f"Bearer {self.api_key}",
                            "content-type": "application/json",
                        },
                        json={
                            "model": self.model,
                            "messages": messages,
                            "temperature": temperature,
                            "response_format": {"type": "json_object"},
                        },
                    )

                if response.status_code == 429 and attempt < self.max_retries:
                    await asyncio.sleep(self._retry_delay(response, attempt))
                    continue

                response.raise_for_status()
                payload = response.json()
                content = payload["choices"][0]["message"]["content"]
                return GroqChatResult(
                    content=content,
                    token_metadata=payload.get("usage", {}),
                )
            except httpx.HTTPStatusError as error:
                last_error = error
                if error.response.status_code == 429 and attempt < self.max_retries:
                    await asyncio.sleep(self._retry_delay(error.response, attempt))
                    continue
                break
            except (httpx.HTTPError, KeyError, IndexError, TypeError) as error:
                last_error = error
                if attempt < self.max_retries:
                    await asyncio.sleep(2**attempt)
                    continue
                break

        if last_error:
            raise last_error
        raise RuntimeError("Groq request failed")

    def _retry_delay(self, response: httpx.Response, attempt: int) -> float:
        retry_after = response.headers.get("retry-after")
        if retry_after:
            try:
                return max(0.0, float(retry_after))
            except ValueError:
                try:
                    retry_at = parsedate_to_datetime(retry_after).timestamp()
                    return max(0.0, retry_at - time())
                except (TypeError, ValueError):
                    pass

        return float(2**attempt)


def get_groq_client() -> GroqClient | None:
    settings = get_settings()
    if not settings.groq_api_key:
        return None

    return GroqClient(
        api_key=settings.groq_api_key,
        model=settings.groq_triage_model,
    )

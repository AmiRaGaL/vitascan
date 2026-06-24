from app.schemas.symptom import NormalizedSymptoms


DURATION_KEYWORDS = [
    "today",
    "one day",
    "1 day",
    "two days",
    "2 days",
    "three days",
    "3 days",
    "week",
    "month",
]

SEVERITY_KEYWORDS = ["mild", "moderate", "severe", "worst"]


def normalize_symptoms(message: str) -> NormalizedSymptoms:
    normalized_message = message.lower()

    return NormalizedSymptoms(
        chief_complaint=normalized_message.strip() or None,
        duration=_first_match(normalized_message, DURATION_KEYWORDS),
        severity=_first_match(normalized_message, SEVERITY_KEYWORDS),
        raw_text=message,
    )


def _first_match(message: str, keywords: list[str]) -> str | None:
    for keyword in keywords:
        if keyword in message:
            return keyword

    return None

from pydantic import BaseModel, Field

from app.schemas.symptom import NormalizedSymptoms


RED_FLAG_RULES = {
    "cardiac_emergency": [
        "chest pain",
        "chest tightness",
        "shortness of breath",
        "sweating",
        "left arm pain",
    ],
    "stroke_warning": [
        "face drooping",
        "slurred speech",
        "one side weakness",
        "sudden confusion",
    ],
    "anaphylaxis": [
        "trouble breathing",
        "swelling lips",
        "swelling tongue",
        "hives",
    ],
}


class RedFlagResult(BaseModel):
    matched: bool = False
    triage: str | None = None
    matched_rules: list[str] = Field(default_factory=list)
    matched_terms: list[str] = Field(default_factory=list)


def detect_red_flags(normalized: NormalizedSymptoms) -> RedFlagResult:
    searchable_text = " ".join(
        [
            normalized.raw_text.lower(),
            normalized.chief_complaint or "",
            " ".join(normalized.associated_symptoms),
            " ".join(normalized.risk_context),
        ],
    )
    matched_rules: list[str] = []
    matched_terms: list[str] = []

    for rule_name, terms in RED_FLAG_RULES.items():
        rule_matches = [term for term in terms if term in searchable_text]
        if rule_matches:
            matched_rules.append(rule_name)
            matched_terms.extend(rule_matches)

    return RedFlagResult(
        matched=bool(matched_rules),
        triage="emergency" if matched_rules else None,
        matched_rules=matched_rules,
        matched_terms=matched_terms,
    )

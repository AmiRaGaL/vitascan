from app.schemas.triage import TriageDecision, TriageResponse


DISCLAIMER = (
    "VitaScan provides educational triage guidance only and is not a diagnosis. "
    "A licensed clinician should make medical decisions."
)


TRIAGE_TEMPLATES = {
    "home_care": "This sounds appropriate for home care with careful monitoring.",
    "primary_care": "Consider arranging primary care follow-up for this concern.",
    "urgent_care": "Consider seeking urgent care, especially if symptoms persist or worsen.",
    "emergency": "This may be a medical emergency. Please seek immediate care now or call local emergency services.",
}


def build_triage_response(
    decision: TriageDecision,
    citations: list[dict],
    trace_id: str,
) -> TriageResponse:
    response_parts = [TRIAGE_TEMPLATES[decision.triage_level]]
    if decision.reasoning:
        response_parts.append(" ".join(decision.reasoning))
    response_parts.append(DISCLAIMER)

    return TriageResponse(
        triage_level=decision.triage_level,
        confidence=decision.confidence,
        response=" ".join(response_parts),
        citations=filter_citations(citations, decision.evidence_ids),
        follow_up_questions=decision.follow_up_questions,
        safety_override_applied=decision.safety_override_applied,
        trace_id=trace_id,
    )


def filter_citations(citations: list[dict], evidence_ids: list[str]) -> list[dict]:
    if not evidence_ids:
        return citations

    evidence_id_set = set(evidence_ids)
    return [
        citation
        for index, citation in enumerate(citations)
        if str(citation.get("id") or index) in evidence_id_set
    ]

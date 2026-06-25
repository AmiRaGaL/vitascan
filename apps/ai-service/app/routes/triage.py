import logging
from time import perf_counter

from fastapi import APIRouter, Depends

from app.agents.retrieval import (
    EXPECTED_EMBEDDING_DIMENSIONS,
    embed_query,
    retrieve_medical_chunks,
)
from app.agents.response_builder import build_triage_response
from app.agents.red_flag import detect_red_flags
from app.agents.symptom_intake import normalize_symptoms
from app.agents.triage_decision import decide_triage
from app.schemas.trace import TraceLogCreate
from app.schemas.triage import TriageRequest, TriageResponse
from app.services.security import require_service_token
from app.services.trace_logger import log_trace


router = APIRouter(prefix="/triage", dependencies=[Depends(require_service_token)])
logger = logging.getLogger(__name__)


@router.post("/run", response_model=TriageResponse)
async def run_triage(payload: TriageRequest) -> TriageResponse:
    started_at = perf_counter()
    trace_id = f"mock_trace_{payload.session_id}"
    normalized_symptoms = normalize_symptoms(payload.message)
    red_flags = detect_red_flags(normalized_symptoms)
    retrieved_chunks: list[dict] = []
    retrieval_error: str | None = None

    try:
        query_text = normalized_symptoms.chief_complaint or payload.message
        logger.info("Retrieval query text length: %s", len(query_text))
        query_embedding = embed_query(query_text)
        logger.info("Retrieval query embedding dimension: %s", len(query_embedding))
        if len(query_embedding) != EXPECTED_EMBEDDING_DIMENSIONS:
            raise ValueError(
                f"Query embedding length was {len(query_embedding)}, expected {EXPECTED_EMBEDDING_DIMENSIONS}."
            )
        retrieved_chunks = retrieve_medical_chunks(
            query_text=query_text,
            query_embedding=query_embedding,
            match_count=5,
        )
        logger.info("Retrieval chunks returned: %s", len(retrieved_chunks))
    except Exception as exc:
        retrieval_error = short_error_message(exc)
        logger.warning("Retrieval failed: %s", retrieval_error)
        retrieved_chunks = []

    decision = await decide_triage(
        normalized=normalized_symptoms,
        health_profile=payload.health_profile,
        retrieved_chunks=retrieved_chunks,
        red_flags=red_flags,
    )
    decision = decision.model_copy(
        update={"evidence_ids": get_retrieved_chunk_ids(retrieved_chunks)}
    )
    citations = build_citations(retrieved_chunks)

    response = build_triage_response(
        decision=decision,
        citations=citations,
        trace_id=trace_id,
    )

    latency_ms = int((perf_counter() - started_at) * 1000)
    try:
        log_trace(
            TraceLogCreate(
                trace_id=trace_id,
                session_id=payload.session_id,
                user_id=payload.user_id,
                request_text=payload.message,
                latency_ms=latency_ms,
                normalized_symptoms=normalized_symptoms.model_dump(
                    exclude={"raw_text"}
                ),
                red_flags=red_flags.model_dump(),
                retrieved_chunks=retrieved_chunks,
                retrieval_error=retrieval_error,
                triage_decision=decision.model_dump(
                    exclude={"model_name", "token_metadata"}
                ),
                model_name=decision.model_name,
                token_metadata=decision.token_metadata,
                validation_passed=decision.validation_passed,
                fallback_used=decision.fallback_used,
            )
        )
    except Exception:
        pass

    return response


def get_retrieved_chunk_ids(retrieved_chunks: list[dict]) -> list[str]:
    return [
        str(chunk["id"])
        for chunk in retrieved_chunks
        if chunk.get("id") is not None
    ]


def build_citations(retrieved_chunks: list[dict]) -> list[dict]:
    citations = []
    for chunk in retrieved_chunks:
        citation = {
            "id": chunk.get("id"),
            "source": chunk.get("source"),
            "title": chunk.get("title"),
        }
        if chunk.get("url"):
            citation["url"] = chunk.get("url")
        citations.append(citation)
    return citations


def short_error_message(exc: Exception) -> str:
    message = str(exc).strip() or exc.__class__.__name__
    return message[:300]

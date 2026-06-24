from pydantic import BaseModel, Field


class TraceLogCreate(BaseModel):
    trace_id: str
    session_id: str
    user_id: str | None = None
    request_text: str
    latency_ms: int
    normalized_symptoms: dict = Field(default_factory=dict)
    red_flags: dict = Field(default_factory=dict)
    retrieved_chunks: list[dict] = Field(default_factory=list)
    triage_decision: dict = Field(default_factory=dict)
    model_name: str | None = None
    token_metadata: dict = Field(default_factory=dict)
    validation_passed: bool = True
    fallback_used: bool = False


class TraceLog(BaseModel):
    trace_id: str
    session_id: str | None = None
    user_id: str | None = None
    event_type: str
    payload: dict = Field(default_factory=dict)
    created_at: str | None = None

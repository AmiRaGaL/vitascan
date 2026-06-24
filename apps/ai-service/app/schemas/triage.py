from typing import Literal

from pydantic import BaseModel, Field


class HealthProfile(BaseModel):
    age: int | None = None
    sex: str | None = None
    conditions: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)


class TriageRequest(BaseModel):
    user_id: str | None = None
    session_id: str
    message: str
    health_profile: HealthProfile


class TriageResponse(BaseModel):
    triage_level: str = "primary_care"
    confidence: float = 0.5
    response: str = "Mock triage response..."
    citations: list[dict] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    safety_override_applied: bool = False
    trace_id: str


class TriageDecision(BaseModel):
    triage_level: Literal["home_care", "primary_care", "urgent_care", "emergency"]
    confidence: float = Field(ge=0, le=1)
    reasoning: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    safety_override_applied: bool = False
    model_name: str | None = None
    token_metadata: dict = Field(default_factory=dict)
    validation_passed: bool = True
    fallback_used: bool = False

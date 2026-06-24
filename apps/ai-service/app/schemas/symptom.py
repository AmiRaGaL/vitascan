from pydantic import BaseModel, Field


class NormalizedSymptoms(BaseModel):
    chief_complaint: str | None = None
    duration: str | None = None
    severity: str | None = None
    associated_symptoms: list[str] = Field(default_factory=list)
    risk_context: list[str] = Field(default_factory=list)
    raw_text: str

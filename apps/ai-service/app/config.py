import os
from functools import lru_cache

from dotenv import load_dotenv
from pydantic import BaseModel


load_dotenv()


class Settings(BaseModel):
    ai_service_token: str | None = None
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    groq_api_key: str | None = None
    groq_triage_model: str = "llama-3.1-70b-versatile"
    groq_fast_model: str = "llama-3.1-8b-instant"


@lru_cache
def get_settings() -> Settings:
    return Settings(
        ai_service_token=os.getenv("AI_SERVICE_TOKEN"),
        supabase_url=os.getenv("SUPABASE_URL"),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        groq_api_key=os.getenv("GROQ_API_KEY"),
        groq_triage_model=os.getenv("GROQ_TRIAGE_MODEL", "llama-3.1-70b-versatile"),
        groq_fast_model=os.getenv("GROQ_FAST_MODEL", "llama-3.1-8b-instant"),
    )

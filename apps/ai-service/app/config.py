import os
from functools import lru_cache

from dotenv import load_dotenv
from pydantic import BaseModel


load_dotenv()


class Settings(BaseModel):
    ai_service_token: str | None = None
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings(
        ai_service_token=os.getenv("AI_SERVICE_TOKEN"),
        supabase_url=os.getenv("SUPABASE_URL"),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
    )

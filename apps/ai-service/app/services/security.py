from fastapi import Header, HTTPException, status

from app.config import get_settings


def require_service_token(x_service_token: str | None = Header(default=None)) -> None:
    expected_token = get_settings().ai_service_token
    if not expected_token or x_service_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service token",
        )

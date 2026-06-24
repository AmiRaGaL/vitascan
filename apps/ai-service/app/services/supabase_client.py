import httpx

from app.config import get_settings


class SupabaseClient:
    def __init__(self, url: str, service_role_key: str) -> None:
        self.url = url.rstrip("/")
        self.service_role_key = service_role_key

    def rpc(self, function_name: str, payload: dict) -> list[dict]:
        response = httpx.post(
            f"{self.url}/rest/v1/rpc/{function_name}",
            headers={
                "apikey": self.service_role_key,
                "authorization": f"Bearer {self.service_role_key}",
                "content-type": "application/json",
            },
            json=payload,
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, list) else []

    def insert(self, table_name: str, row: dict) -> None:
        response = httpx.post(
            f"{self.url}/rest/v1/{table_name}",
            headers={
                "apikey": self.service_role_key,
                "authorization": f"Bearer {self.service_role_key}",
                "content-type": "application/json",
                "prefer": "return=minimal",
            },
            json=row,
            timeout=10.0,
        )
        response.raise_for_status()

    def select(self, table_name: str, params: dict) -> list[dict]:
        response = httpx.get(
            f"{self.url}/rest/v1/{table_name}",
            headers={
                "apikey": self.service_role_key,
                "authorization": f"Bearer {self.service_role_key}",
            },
            params=params,
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, list) else []


def get_supabase_client() -> SupabaseClient | None:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None

    return SupabaseClient(
        url=settings.supabase_url,
        service_role_key=settings.supabase_service_role_key,
    )

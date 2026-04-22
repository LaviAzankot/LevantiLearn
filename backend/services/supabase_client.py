"""
Supabase admin client — singleton used across all API modules.
Uses the service_role key so it can:
  - verify user JWTs
  - perform admin DB writes (bypassing RLS when needed)
Never expose this client or its key to the frontend.
"""

import os
from supabase import create_client, Client

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
            )
        _client = create_client(url, key)
    return _client

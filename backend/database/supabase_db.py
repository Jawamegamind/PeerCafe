from supabase import Client, create_client
from dotenv import load_dotenv
import os

def create_supabase_client() -> Client | None:
    """Create and return a Supabase client if env vars are present.

    Returns None when configuration is missing, so callers can handle gracefully.
    """
    # Load environment variables
    load_dotenv()

    # Allow either backend or frontend-style variable names
    project_url = os.getenv("PROJECT_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    project_key = os.getenv("API_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not project_url or not project_key:
        # Missing configuration; caller should handle None.
        return None

    try:
        supabase: Client = create_client(project_url, project_key)
        return supabase
    except Exception:
        # If client creation fails (e.g., invalid URL/key), surface as None and let
        # the API layer return a clear error to the user instead of crashing startup.
        return None
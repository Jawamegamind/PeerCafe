import os

from dotenv import load_dotenv
from supabase import Client, create_client


def create_supabase_client():
    """Create and return a Supabase client"""
    # Load environment variables
    load_dotenv()

    # Get environment variables at runtime
    project_url = os.getenv("PROJECT_URL")
    project_key = os.getenv("API_KEY")

    supabase: Client = create_client(project_url, project_key)
    return supabase

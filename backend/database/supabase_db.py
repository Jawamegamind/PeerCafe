from supabase import Client, create_client
from dotenv import load_dotenv
import os

load_dotenv()

project_url = os.getenv("PROJECT_URL")
project_key = os.getenv("API_KEY")

def create_supabase_client():
    supabase: Client = create_client(project_url, project_key)
    return supabase
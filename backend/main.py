from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.supabase_db import create_supabase_client

# Initializing the FastAPI app
app = FastAPI()

# Connecting to Supabase
# Initializing the Supabase client
supabase = create_supabase_client()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Basic root endpoint
@app.get("/")
def read_root():
    return {"message": "PeerCafe Backend is running!"}

# Testing endpoint to fetch dummy data from Supabase
@app.get("/test-supabase")
def test_supabase():
    data = supabase.from_("testing").select("*").execute()
    return data
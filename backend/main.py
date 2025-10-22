from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.supabase_db import create_supabase_client

from routes.auth_routes import auth_router
from routes.restaurant_routes import restaurant_router
from routes.menu_routes import menu_router
from routes.order_routes import router as order_router

# Initializing the FastAPI app
app = FastAPI()

# Connecting to Supabase (lazily and safely)
# Initialize the Supabase client if configuration is present; otherwise keep None
supabase = create_supabase_client()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setting up the imported routers
app.include_router(auth_router, prefix="/api")
app.include_router(restaurant_router, prefix="/api")
app.include_router(menu_router, prefix="/api")
app.include_router(order_router, prefix="/api")

# Basic root endpoint
@app.get("/")
def read_root():
    return {"message": "PeerCafe Backend is running!"}

# Testing endpoint to fetch dummy data from Supabase
@app.get("/test-supabase")
def test_supabase():
    from fastapi import HTTPException, status
    # If the client is not configured, return a clear service unavailable error
    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Supabase is not configured. Set PROJECT_URL and API_KEY in backend/.env "
                "(or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)."
            ),
        )
    try:
        data = supabase.from_("testing").select("*").execute()
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}",
        )
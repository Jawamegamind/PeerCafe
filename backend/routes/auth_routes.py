from fastapi import APIRouter, HTTPException, status
from fastapi import Header, Request
from database.supabase_db import create_supabase_client
from models.user_model import User
from models.login_model import LoginRequestModel
import bcrypt

auth_router = APIRouter()
# Initialize once; may be None if env vars missing. Tests patch this symbol directly.
supabase = create_supabase_client()

def get_supabase_client():
    """Return a Supabase client if available, else None.
    Tries module-level first (to support unit-test patching), else creates on-demand.
    """
    global supabase
    if supabase is not None:
        return supabase
    supabase = create_supabase_client()
    return supabase

def user_exists(key: str = "Email", value: str | None = None):
    client = get_supabase_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured. Set backend/.env and restart.",
        )
    user = client.from_("users").select("*").eq(key, value).execute()
    return len(user.data) > 0

@auth_router.post("/register")
def create_user(user: User, authorization: str = Header(None)):
    print("Creating user:", user)
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured. Set backend/.env and restart.",
            )
        # Extract the Supabase token if sent
        token = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
        
        if token:
            # print("Received token:", token)
            # Here you can add logic to validate the token if needed
            client.postgrest.auth(token)

        user_email = user.Email.lower()
        hased_password = bcrypt.hashpw(user.Password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        if user_exists(value=user_email):
            return {"message": "User already exists"}

        # user = supabase.from_("users").insert({
        #     "user_id": user.user_id,
        #     "name": user.name,
        #     "email": user_email,
        #     "password": hased_password,
        #     "role": user.role
        # }).execute()
        user = client.from_("users").insert({
            "user_id": user.user_id,
            "FirstName": user.FirstName,
            "LastName": user.LastName,
            "Email": user_email,
            "Phone": user.Phone,
            "IsAdmin": user.IsAdmin,
            "IsActive": user.IsActive,
            "Password": hased_password
        }).execute()

        if user:
            return {"message": "User created successfully"}
        else:
            return {"message": "User creation failed"}
    except Exception as e:
        print("Error:", e)
        return {"message": "User creation failed"}

@auth_router.post("/login")
def login_user(login_request: LoginRequestModel, authorization: str = Header(None)):
    print("Login attempt for:", login_request.Email)
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured. Set backend/.env and restart.",
            )
        # Extract the token from Authorization header
        token = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
        
        if token:
            # print("Received token:", token)
            # Here you can add logic to validate the token if needed
            client.postgrest.auth(token)

        user_email = login_request.Email.lower()
        response = client.from_("users").select("*").eq("Email", user_email).execute()

        if not response.data:
            return {"message": "User not found"}

        db_user = response.data[0]

        if bcrypt.checkpw(login_request.Password.encode('utf-8'), db_user['Password'].encode('utf-8')):
            return {"message": "Login successful", "user": db_user}
        else:
            return {"message": "Invalid password"}

    except Exception as e:
        print("Error:", e)
        return {"message": "Login failed"}

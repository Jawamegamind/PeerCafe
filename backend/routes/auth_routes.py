from fastapi import APIRouter
from database.supabase_db import create_supabase_client
from models.user_model import User
# from models.login_model import LoginRequestModel
import bcrypt

auth_router = APIRouter()
supabase = create_supabase_client()

def user_exists(key: str = "Email", value: str = None):
    user = supabase.from_("Users").select("*").eq(key, value).execute()
    return len(user.data) > 0

@auth_router.post("/register")
def create_user(user: User):
    print("Creating user:", user)
    try:
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
        user = supabase.from_("Users").insert({
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
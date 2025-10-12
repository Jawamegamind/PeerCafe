from pydantic import BaseModel

class LoginRequestModel(BaseModel):
    user_id: str
    Email: str
    Password: str
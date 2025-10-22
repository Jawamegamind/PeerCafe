from pydantic import BaseModel

class LoginRequestModel(BaseModel):
    user_id: str
    email: str
    password: str
from pydantic import BaseModel


class User(BaseModel):
    user_id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    is_admin: bool
    is_active: bool
    password: str

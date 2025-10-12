from pydantic import BaseModel

class User(BaseModel):
    user_id: str
    FirstName: str
    LastName: str
    Email: str
    Phone: str
    IsAdmin: bool
    IsActive: bool
    Password: str
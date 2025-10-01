from pydantic import BaseModel, Field
from bson import ObjectId
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: str
    password: str  # Plain password to be hashed
    score: int = 0  # Default score is 0

class UserResponse(BaseModel):
    _id: Optional[str] = Field(None, alias="_id")  
    name: str
    email: str
    hashed_password: Optional[str] = None  
    score: int

    class Config:
        json_encoders = {
            ObjectId: str 
        }
        arbitrary_types_allowed = True  
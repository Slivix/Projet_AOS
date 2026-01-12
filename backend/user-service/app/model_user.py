from pydantic import BaseModel, Field
from bson import ObjectId
from typing import Optional, List

class HistoryEntry(BaseModel):
    game_id: Optional[str] = None
    mode: Optional[str] = None
    result: Optional[str] = None
    opponent: Optional[str] = None
    winner: Optional[str] = None
    rows: Optional[int] = None
    cols: Optional[int] = None
    connect: Optional[int] = None
    move_count: Optional[int] = None
    duration_s: Optional[int] = None
    ended_at: Optional[str] = None

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    score: int = 0


class UserResponse(BaseModel):
    _id: Optional[str] = Field(None, alias="_id")
    name: str
    email: str
    hashed_password: Optional[str] = None
    score: int
    history: Optional[List[HistoryEntry]] = None

    class Config:
        json_encoders = {
            ObjectId: str
        }
        arbitrary_types_allowed = True
        allow_population_by_field_name = True

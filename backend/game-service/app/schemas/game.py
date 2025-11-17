# app/schemas/game.py
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field
from app.schemas.player import Player

class GameStatus(str, Enum):
    active = "active"
    won = "won"
    draw = "draw"

class GameConfig(BaseModel):
    rows: int = Field(default=6, ge=4)
    cols: int = Field(default=7, ge=4)
    connect: int = Field(default=4, ge=3)

class GameState(BaseModel):
    id: int
    players: List[Player]
    config: GameConfig
    board: List[List[int]]          
    current_player_index: int = 0
    status: GameStatus = GameStatus.active
    winner_id: Optional[int] = None

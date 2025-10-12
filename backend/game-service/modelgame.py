from pydantic import BaseModel
from typing import List, Optional
from modelplayer import Player

# Modèle
class Game(BaseModel):
    id: int
    players: List[Player]
    current_turn: int  # Tour du joueur(ID)
    board: List[List[int]]  # plateau 
    status: Optional[str] = "active"  # Statut de la game (active, won, draw)

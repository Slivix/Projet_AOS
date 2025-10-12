# player.py
from pydantic import BaseModel

# Modèle 
class Player(BaseModel):
    id: int
    name: str
from fastapi import APIRouter, HTTPException, Body, Query
from typing import Dict, List
from pydantic import BaseModel

from app.core.engine import create_board, drop_token, check_winner, is_draw
from app.schemas.game import GameState, GameConfig
from app.schemas.player import Player
from app.core import user_client as users_client

router = APIRouter()
router_online = APIRouter()

# ---- Parties locales (en mémoire) ----
GAMES: Dict[int, GameState] = {}

class GameCreate(BaseModel):
    id: int
    players: List[Player]
    rows: int = 6
    cols: int = 7
    connect: int = 4

class Move(BaseModel):
    column: int
    player_id: int

@router.get("/", response_model=List[GameState])
def list_games():
    return list(GAMES.values())

@router.post("/", response_model=GameState)
def create_game(payload: GameCreate):
    if payload.id in GAMES:
        raise HTTPException(status_code=400, detail="ID déjà utilisé.")
    cfg = GameConfig(rows=payload.rows, cols=payload.cols, connect=payload.connect)
    board = create_board(cfg.rows, cfg.cols)
    game = GameState(id=payload.id, players=payload.players, config=cfg, board=board)
    GAMES[payload.id] = game
    return game

@router.put("/{game_id}/move", response_model=GameState)
def play_move(game_id: int, move: Move):
    game = GAMES.get(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game.status != "active":
        raise HTTPException(status_code=409, detail=f"Game is {game.status}")

    current = game.players[game.current_player_index]
    if move.player_id != current.id:
        raise HTTPException(status_code=403, detail="Not this player's turn")

    try:
        r, c = drop_token(game.board, move.column, move.player_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if check_winner(game.board, r, c, move.player_id, game.config.connect):
        game.status = "won"
        game.winner_id = move.player_id
        return game

    if is_draw(game.board):
        game.status = "draw"
        return game

    game.current_player_index = (game.current_player_index + 1) % len(game.players)
    return game

@router.delete("/{game_id}")
def delete_game(game_id: int):
    if game_id in GAMES:
        del GAMES[game_id]
        return {"message": "Game deleted successfully"}
    raise HTTPException(status_code=404, detail="Game not found")

# ---- MODE EN LIGNE (lobby simple en mémoire) --------------------------------
from fastapi import Body
from typing import Dict
from app.core.engine import create_board, drop_token, check_winner, is_draw
from app.schemas.game import GameState, GameConfig
from app.schemas.player import Player
from app.core import user_client as users_client

router_online = APIRouter()
_online: Dict[str, GameState] = {}   # gameCode -> GameState

class OnlineCreate(BaseModel):
    gameCode: str
    playerName: str
    rows: int = 6
    cols: int = 7
    connect: int = 4
    verify_user: bool = True

class OnlineJoin(BaseModel):
    gameCode: str
    playerName: str
    verify_user: bool = False

@router_online.post("/")
def create_online_game(payload: OnlineCreate):
    # Optionnel : vérifier l'existence côté user-service
    if payload.verify_user and not users_client.user_exists(payload.playerName):
        raise HTTPException(status_code=404, detail="User not found")

    if payload.gameCode in _online:
        raise HTTPException(status_code=400, detail="Game code already exists")

    cfg = GameConfig(rows=payload.rows, cols=payload.cols, connect=payload.connect)
    board = create_board(cfg.rows, cfg.cols)

    state = GameState(
        id=hash(payload.gameCode) & 0x7FFFFFFF,   # id interne
        players=[Player(id=1, name=payload.playerName)],  # J1 créé
        config=cfg,
        board=board,
        current_player_index=0,
    )
    _online[payload.gameCode] = state
    return {"message": "Lobby created", "code": payload.gameCode, "state": state}

@router_online.post("/join")
def join_online_game(payload: OnlineJoin):
    if payload.verify_user and not users_client.user_exists(payload.playerName):
        raise HTTPException(status_code=404, detail="User not found")

    g = _online.get(payload.gameCode)
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")
    if len(g.players) == 2:
        raise HTTPException(status_code=409, detail="Game already full")

    # Empêche les doublons de pseudo dans la même partie
    if any(p.name == payload.playerName for p in g.players):
        raise HTTPException(status_code=400, detail="Name already used in this game")

    g.players.append(Player(id=2, name=payload.playerName))
    return {"message": "Joined", "state": g}

@router_online.get("/lobbies")
def list_lobbies():
    # Small summary list for the frontend
    return [
        {
            "room_id": code,
            "players": [p.name for p in g.players],
            "status": g.status,
        }
        for code, g in _online.items()
    ]

@router_online.get("/{code}")
def online_state(code: str):
    g = _online.get(code)
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")
    return g

@router_online.put("/{code}/move")
def online_move(code: str, move: Move):
    g = _online.get(code)
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")
    if g.status != "active":
        raise HTTPException(status_code=409, detail=f"Game is {g.status}")
    if len(g.players) < 2:
        raise HTTPException(status_code=409, detail="Waiting for opponent")

    current = g.players[g.current_player_index]
    if move.player_id != current.id:
        raise HTTPException(status_code=403, detail="Not this player's turn")

    try:
        r, c = drop_token(g.board, move.column, move.player_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if check_winner(g.board, r, c, move.player_id, g.config.connect):
        g.status = "won"
        g.winner_id = move.player_id
        return g

    if is_draw(g.board):
        g.status = "draw"
        return g

    g.current_player_index = (g.current_player_index + 1) % len(g.players)
    return g

@router_online.post("/{code}/reset")
def online_reset(code: str):
    g = _online.get(code)
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")
    g.board = create_board(g.config.rows, g.config.cols)
    g.status = "active"
    g.winner_id = None
    g.current_player_index = 0
    return {"message": "Reset", "state": g}

@router_online.delete("/{code}")
def online_destroy(code: str):
    if code in _online:
        del _online[code]
        return {"message": "Destroyed"}
    raise HTTPException(status_code=404, detail="Game not found")

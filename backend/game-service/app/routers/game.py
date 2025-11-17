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

# ---- Mode en ligne en test ----
online_games: Dict[str, dict] = {}  # gameCode -> état

@router_online.post("/")
def create_online_game(
    playerName: str = Body(...),
    gameCode: str = Body(...),
    rows: int = Body(6),
    cols: int = Body(7),
    connect: int = Body(4),
    verify_user: bool = Body(True)
):
    if gameCode in online_games:
        raise HTTPException(status_code=400, detail="Game code already exists.")
    if any(g.get("player1") == playerName or g.get("player2") == playerName
           for g in online_games.values()):
        raise HTTPException(status_code=400, detail="Player name is already in use.")
    if verify_user and not users_client.user_exists(playerName):
        raise HTTPException(status_code=404, detail="User does not exist in user-service.")

    online_games[gameCode] = {
        "player1": playerName,
        "player2": None,
        "board": create_board(rows, cols),
        "current_turn": 1,
        "status": "waiting",
        "rows": rows, "cols": cols, "connect": connect
    }
    return {"message": "Online game created successfully."}

@router_online.post("/join")
def join_online_game(playerName: str = Body(...), gameCode: str = Body(...), verify_user: bool = Body(True)):
    game = online_games.get(gameCode)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    if game["player2"] is not None:
        raise HTTPException(status_code=400, detail="Game already has two players.")
    if playerName in [game["player1"], game["player2"]] or any(
        g.get("player1") == playerName or g.get("player2") == playerName
        for g in online_games.values()
    ):
        raise HTTPException(status_code=400, detail="Player name is already in use.")
    if verify_user and not users_client.user_exists(playerName):
        raise HTTPException(status_code=404, detail="User does not exist in user-service.")

    game["player2"] = playerName
    game["status"] = "ready"
    return {"message": "Joined game successfully.", "game": game}

@router_online.get("/{gameCode}")
def get_online_game_status(gameCode: str):
    game = online_games.get(gameCode)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    return game

@router_online.put("/{gameCode}")
def play_online_move(gameCode: str, column: int = Query(..., ge=0), player_id: int = Query(...)):
    game = online_games.get(gameCode)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    if game["status"] not in ("waiting", "ready", "active"):
        raise HTTPException(status_code=400, detail="Game is not in a playable state.")
    if player_id not in [1, 2]:
        raise HTTPException(status_code=400, detail="Invalid player ID")

    try:
        r, c = drop_token(game["board"], column, player_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if check_winner(game["board"], r, c, player_id, game["connect"]):
        game["status"] = "won"
        game["winner_id"] = player_id
        # Optionnel : users_client.add_score(winner_name, +1) si tu ajoutes un endpoint côté user-service
        return {"message": f"Player {player_id} wins!", "board": game["board"], "status": "won", "winner_id": player_id}

    if is_draw(game["board"]):
        game["status"] = "draw"
        return {"message": "The game is a draw!", "board": game["board"], "status": "draw"}

    game["current_turn"] = 2 if player_id == 1 else 1
    game["status"] = "active"
    return {"message": f"Player {player_id} played in column {column}", "board": game["board"], "status": "active", "current_turn": game["current_turn"]}

@router_online.patch("/{gameCode}/reset")
def reset_online_game(gameCode: str):
    game = online_games.get(gameCode)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    game["next_start_player"] = 2 if game.get("next_start_player") == 1 else 1
    start = game["next_start_player"]
    game["board"] = create_board(game["rows"], game["cols"])
    game.pop("winner_id", None)
    game["status"] = "active"
    game["current_turn"] = start
    return {"message": f"Game reset. Player {start} starts now.", "board": game["board"], "status": "active", "current_turn": start}

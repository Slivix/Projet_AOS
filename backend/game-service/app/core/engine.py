from typing import List, Tuple

Board = List[List[int]]

def create_board(rows: int, cols: int) -> Board:
    if rows < 4 or cols < 4:
        raise ValueError("Board must be at least 4x4.")
    return [[0 for _ in range(cols)] for _ in range(rows)]

def drop_token(board: Board, column: int, player_id: int) -> Tuple[int, int]:
    rows = len(board)
    cols = len(board[0]) if rows else 0
    if not (0 <= column < cols):
        raise ValueError("Colonne hors limites.")
    for r in range(rows - 1, -1, -1):
        if board[r][column] == 0:
            board[r][column] = player_id
            return r, column
    raise ValueError("Colonne pleine.")

def _count(board: Board, r: int, c: int, dr: int, dc: int, pid: int) -> int:
    rows, cols = len(board), len(board[0])
    n = 0
    while 0 <= r < rows and 0 <= c < cols and board[r][c] == pid:
        n += 1
        r += dr
        c += dc
    return n

def check_winner(board: Board, last_r: int, last_c: int, pid: int, connect: int) -> bool:
    for dr, dc in [(0,1),(1,0),(1,1),(1,-1)]:
        line = _count(board, last_r, last_c, dr, dc, pid) + \
               _count(board, last_r, last_c, -dr, -dc, pid) - 1
        if line >= connect:
            return True
    return False

def is_draw(board: Board) -> bool:
    return all(cell != 0 for row in board for cell in row)

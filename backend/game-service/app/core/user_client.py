import os
import requests
from typing import Optional

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://127.0.0.1:8002")

def _url(path: str) -> str:
    return USER_SERVICE_URL.rstrip("/") + path

def user_exists(name: str) -> bool:
    # Vérifie l’existence via GET /users/score/{name} (404 si absent)
    r = requests.get(_url(f"/users/score/{name}"))
    return r.status_code == 200

def list_users():
    r = requests.get(_url("/users/"))
    if r.status_code == 200:
        return r.json()
    return []

def login(name: str, password: str) -> bool:
    r = requests.post(_url("/auth/"), json={"name": name, "password": password})
    return r.status_code == 200

# Placeholder si un endpoint d'update de score est ajouté plus tard :
def add_score(name: str, delta: int) -> Optional[int]:
    try:
        r = requests.post(_url("/users/score"), json={"name": name, "score": delta})
        if r.status_code == 200:
            return r.json().get("new_score")
    except Exception:
        pass
    return None

from fastapi import FastAPI, Depends
from app.routers import user
from pymongo import MongoClient
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration de la connexion à MongoDB
mongo_uri = os.getenv("MONGO_URI", "mongodb://mongo:27017")
client = MongoClient(mongo_uri)
db = client["user_db"]

# Inclure les routes du service utilisateur
app.include_router(user.user_router)
app.include_router(user.auth_router)

# Route d'accueil
@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API Utilisateur"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8002, reload=True)
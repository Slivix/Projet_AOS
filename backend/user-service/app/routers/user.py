from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field
from pymongo.collection import Collection
from pymongo import MongoClient
from passlib.context import CryptContext
import os
import logging
from typing import List, Optional
from bson import ObjectId

class UserCreate(BaseModel):
    name: str
    email: str
    password: str  # Plain password to be hashed
    score: int = 0  # Default score is 0

class UserResponse(BaseModel):
    _id: Optional[str] = Field(None, alias="_id")  # MongoDB ObjectId, alias to handle _id correctly
    name: str
    email: str
    hashed_password: Optional[str] = None  # Only for internal use, don't send in the response
    score: int

    class Config:
        json_encoders = {
            ObjectId: str  # Convert ObjectId to string for serialization
        }
        arbitrary_types_allowed = True  # Allow ObjectId to be used directly

# Définir les routers
user_router = APIRouter(prefix="/users", tags=["users"])
auth_router = APIRouter(prefix="/auth", tags=["auth"])

# MongoDB configuration
mongo_uri = os.getenv("MONGO_URI", "mongodb://mongo:27017")
client = MongoClient(mongo_uri)
db = client["user_db"]

# Logger configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user_collection() -> Collection:
    return db["users"]

# Route to get all users
@user_router.get("/", response_model=List[UserResponse])
def get_users(user_collection=Depends(get_user_collection)):
    logger.info("Request received to get all users")
    users = list(user_collection.find())
    
    # Convert ObjectId to string for all users
    for user in users:
        user["_id"] = str(user["_id"])  # Convert ObjectId to string
    
    logger.info(f"Retrieved {len(users)} users")
    return users


# Route to register a user
@user_router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, user_collection=Depends(get_user_collection)):
    logger.info("Register user request received")

    # Check if the email or name already exists
    if user_collection.find_one({"email": user.email}) or user_collection.find_one({"name": user.name}):
        logger.error("Email or name already registered")
        raise HTTPException(status_code=400, detail="Email or name already registered")
    
    # Hash the password
    hashed_password = pwd_context.hash(user.password)  # Hash the plain password
    
    # Prepare user data for insertion into MongoDB
    user_dict = user.dict(exclude={"password"})  # Exclude plain password from the data going into DB
    user_dict["hashed_password"] = hashed_password  # Store hashed password

    logger.info(f"Inserting user data into database: {user_dict}")
    
    # Insert user into the database
    result = user_collection.insert_one(user_dict)

    # Check if the insertion was successful
    if result.acknowledged:
        logger.info(f"User successfully registered with ID: {result.inserted_id}")
        user_dict["_id"] = str(result.inserted_id)  # Convert ObjectId to string for response
        return UserResponse(**user_dict)  # Return the user data with ID as string
    else:
        logger.error("Failed to insert user into database")
        raise HTTPException(status_code=500, detail="Failed to register user")


@user_router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str, user_collection=Depends(get_user_collection)):
    """
    Supprime un utilisateur par son ID.
    """
    # Vérifie si l'ID est valide
    if not ObjectId.is_valid(user_id):
        logger.error(f"Invalid user ID: {user_id}")
        raise HTTPException(status_code=400, detail="Invalid user ID")

    logger.info(f"Delete request received for user ID: {user_id}")

    # Supprime l'utilisateur
    result = user_collection.delete_one({"_id": ObjectId(user_id)})

    # Vérifie si un utilisateur a été supprimé
    if result.deleted_count == 1:
        logger.info(f"User with ID {user_id} successfully deleted")
        return  # FastAPI renverra un HTTP 204 No Content
    else:
        logger.error(f"User with ID {user_id} not found")
        raise HTTPException(status_code=404, detail="User not found")
    

# Route to login a user
@auth_router.post("/")
def login_user(
    user_collection=Depends(get_user_collection),
    name: str = Body(..., embed=True),
    password: str = Body(..., embed=True)
):
    logger.info(f"Login request received for name={name}")
    db_user = user_collection.find_one({"name": name})
    if db_user and pwd_context.verify(password, db_user["hashed_password"]):
        logger.info("Login successful")
        return {"success": True, "message": "Login successful!"}
    logger.error("Invalid username or password")
    raise HTTPException(status_code=400, detail="Invalid username or password")

# Route to get the score of a user
@user_router.get("/score/{name}", response_model=int)
def get_user_score(name: str, user_collection=Depends(get_user_collection)):
    logger.info(f"Request received to get score for user {name}")
    user = user_collection.find_one({"name": name})
    if user:
        return user["score"]
    else:
        logger.error(f"User {name} not found")
        raise HTTPException(status_code=404, detail="User not found")

# Route to get all users' scores
@user_router.get("/scores", response_model=List[UserResponse])
def get_all_scores(user_collection=Depends(get_user_collection)):
    logger.info("Request received to get all users' scores")
    users = list(user_collection.find({}, {"name": 1, "email": 1, "score": 1}))
    
    # Convert ObjectId to string for all users
    for user in users:
        user["_id"] = str(user["_id"])  # Convert ObjectId to string
    
    logger.info(f"Retrieved scores for {len(users)} users")
    return users
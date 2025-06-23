# 🔐 AUTHENTICATION MODULE FOR BACKEND
#
# This module handles all user authentication functionality including:
# - User registration and login
# - Password hashing and verification
# - JWT token generation and validation
# - Database models for users
# - Authentication middleware

import os
import jwt
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr

# 🔧 CONFIGURATION
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# 🗄️ DATABASE SETUP
# SQLite database for development (can be changed to PostgreSQL for production)
DATABASE_URL = "sqlite:///./voice_to_text.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 🔒 PASSWORD HASHING
# Using bcrypt for secure password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 🎫 JWT TOKEN SECURITY
security = HTTPBearer()

# 📋 PYDANTIC MODELS FOR API

class UserCreate(BaseModel):
    """Model for user registration request"""
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    """Model for user login request"""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """Model for user data in API responses"""
    id: int
    email: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    """Model for authentication token response"""
    access_token: str
    token_type: str
    user: UserResponse

# 🗄️ DATABASE MODELS

class User(Base):
    """
    User database model
    
    This represents a user in our database with their authentication information.
    Passwords are never stored in plain text - they're hashed using bcrypt.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"

# Create database tables
Base.metadata.create_all(bind=engine)

# 🔧 DATABASE DEPENDENCY

def get_db():
    """
    Database session dependency for FastAPI
    
    This function provides a database session to our API endpoints.
    It ensures the session is properly closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 🔐 AUTHENTICATION FUNCTIONS

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against its hash
    
    Args:
        plain_password: The password entered by the user
        hashed_password: The stored hash from the database
        
    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    
    Args:
        data: Data to encode in the token (usually user ID and email)
        expires_delta: Custom expiration time (optional)
        
    Returns:
        JWT token string
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode a JWT token
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token data if valid, None if invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

# 🔍 USER FUNCTIONS

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """
    Get a user by their email address
    
    Args:
        db: Database session
        email: User's email address
        
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """
    Get a user by their ID
    
    Args:
        db: Database session
        user_id: User's ID
        
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user: UserCreate) -> User:
    """
    Create a new user in the database
    
    Args:
        db: Database session
        user: User creation data
        
    Returns:
        Created user object
        
    Raises:
        HTTPException: If email already exists
    """
    # Check if user already exists
    existing_user = get_user_by_email(db, user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user with hashed password
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate a user with email and password
    
    Args:
        db: Database session
        email: User's email
        password: User's password
        
    Returns:
        User object if authentication successful, None otherwise
    """
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

# 🛡️ AUTHENTICATION MIDDLEWARE

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from JWT token
    
    This dependency can be used in API endpoints that require authentication.
    It extracts the JWT token from the Authorization header, verifies it,
    and returns the corresponding user.
    
    Args:
        credentials: HTTP Authorization credentials
        db: Database session
        
    Returns:
        Current authenticated user
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Extract token from credentials
        token = credentials.credentials
        
        # Verify and decode token
        payload = verify_token(token)
        if payload is None:
            raise credentials_exception
        
        # Get user ID from token
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
    except Exception:
        raise credentials_exception
    
    # Get user from database
    user = get_user_by_id(db, user_id=user_id)
    if user is None:
        raise credentials_exception
    
    return user

# 📝 AUTHENTICATION ENDPOINTS

from fastapi import APIRouter

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/signup", response_model=Token)
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user account
    
    This endpoint allows new users to register for an account.
    It validates the email format, checks if the email is already registered,
    hashes the password securely, and creates the user in the database.
    
    After successful registration, it automatically logs the user in
    by returning an access token.
    """
    try:
        # Create new user
        db_user = create_user(db, user)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": db_user.id, "email": db_user.email},
            expires_delta=access_token_expires
        )
        
        # Return token and user data
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.from_orm(db_user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )

@router.post("/login", response_model=Token)
async def login(user: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user and return access token
    
    This endpoint validates user credentials and returns a JWT token
    if authentication is successful.
    """
    # Authenticate user
    authenticated_user = authenticate_user(db, user.email, user.password)
    if not authenticated_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": authenticated_user.id, "email": authenticated_user.email},
        expires_delta=access_token_expires
    )
    
    # Return token and user data
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(authenticated_user)
    )

@router.get("/validate", response_model=UserResponse)
async def validate_token(current_user: User = Depends(get_current_user)):
    """
    Validate the current user's token and return user information
    
    This endpoint is used to check if a stored token is still valid
    and to get the current user's information.
    """
    return UserResponse.from_orm(current_user)

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user's profile information
    
    This endpoint returns the authenticated user's profile data.
    """
    return UserResponse.from_orm(current_user) 
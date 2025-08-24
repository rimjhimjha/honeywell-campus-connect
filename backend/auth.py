"""
Authentication and authorization for SafeZoneAI

Handles user management, JWT tokens, and role-based access control
"""

import jwt
import bcrypt
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from .database import db_manager
from .config import settings

logger = logging.getLogger(__name__)

# JWT Configuration
SECRET_KEY = "safezone-ai-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "operator"

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class AuthManager:
    """Manages authentication and authorization"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Dict:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    def create_user(self, user_data: UserCreate) -> bool:
        """Create new user"""
        try:
            with db_manager.get_connection() as conn:
                cursor = conn.cursor()
                
                # Check if user exists
                cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", 
                             (user_data.username, user_data.email))
                if cursor.fetchone():
                    return False
                
                # Create user
                hashed_password = self.hash_password(user_data.password)
                cursor.execute("""
                    INSERT INTO users (username, email, password_hash, role)
                    VALUES (?, ?, ?, ?)
                """, (user_data.username, user_data.email, hashed_password, user_data.role))
                
                conn.commit()
                logger.info(f"User created: {user_data.username}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return False
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user credentials"""
        try:
            with db_manager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, username, email, password_hash, role, is_active
                    FROM users WHERE username = ?
                """, (username,))
                
                user = cursor.fetchone()
                if not user or not user['is_active']:
                    return None
                
                if self.verify_password(password, user['password_hash']):
                    # Update last login
                    cursor.execute("""
                        UPDATE users SET last_login = ? WHERE id = ?
                    """, (datetime.now().isoformat(), user['id']))
                    conn.commit()
                    
                    return dict(user)
                
                return None
                
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None

# Global auth manager
auth_manager = AuthManager()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    try:
        payload = auth_manager.verify_token(credentials.credentials)
        username = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, username, email, role, is_active
                FROM users WHERE username = ?
            """, (username,))
            
            user = cursor.fetchone()
            if user is None or not user['is_active']:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or inactive"
                )
            
            return dict(user)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

def require_role(required_role: str):
    """Decorator to require specific role"""
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['admin', required_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker
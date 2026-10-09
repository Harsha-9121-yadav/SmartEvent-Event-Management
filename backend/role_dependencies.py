from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from security import (
    bearer_scheme,
    get_current_user_id
)
from database import get_db
from models import User
from sqlalchemy.orm import Session


# =========================
# GET CURRENT USER
# =========================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
) -> User:

    user_id = get_current_user_id(
        credentials
    )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


# =========================
# REQUIRE USER
# =========================

def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
) -> User:

    user_id = get_current_user_id(
        credentials
    )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.role not in [
        "USER",
        "ORGANIZER",
        "ADMIN"
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user role"
        )

    return user


# =========================
# REQUIRE ORGANIZER
# =========================

def require_organizer(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
) -> User:

    user_id = get_current_user_id(
        credentials
    )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.role != "ORGANIZER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizer access required"
        )

    return user


# =========================
# REQUIRE ADMIN
# =========================

def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
) -> User:

    user_id = get_current_user_id(
        credentials
    )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return user
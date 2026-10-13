
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models import Notification, User
from schemas import NotificationResponse
from security import bearer_scheme, get_current_user_id


router = APIRouter(
    prefix="/api/v1/notifications",
    tags=["Notifications"]
)


# =========================
# GET ALL MY NOTIFICATIONS
# =========================

@router.get(
    "",
    response_model=list[NotificationResponse]
)
def get_my_notifications(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    return notifications


# =========================
# GET UNREAD NOTIFICATION COUNT
# =========================

@router.get("/unread-count")
def get_unread_count(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False)
        )
        .count()
    )

    return {
        "unread_count": count
    }


# =========================
# MARK ONE NOTIFICATION AS READ
# =========================

@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse
)
def mark_notification_as_read(
    notification_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found."
        )

    notification.is_read = True

    try:
        db.commit()
        db.refresh(notification)
        return notification
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update notification."
        )


# =========================
# MARK ALL NOTIFICATIONS AS READ
# =========================

@router.patch("/read-all")
def mark_all_notifications_as_read(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    try:
        updated_count = (
            db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read.is_(False)
            )
            .update(
                {Notification.is_read: True},
                synchronize_session=False
            )
        )

        db.commit()

        return {
            "message": "All notifications marked as read.",
            "updated_count": updated_count
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not mark notifications as read."
        )


# =========================
# DELETE ONE NOTIFICATION
# =========================

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found."
        )

    try:
        db.delete(notification)
        db.commit()

        return {
            "message": "Notification deleted successfully."
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete notification."
        )

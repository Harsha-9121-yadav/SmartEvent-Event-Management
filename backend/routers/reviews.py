
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import Booking, Event, Review, User
from security import bearer_scheme, get_current_user_id


router = APIRouter(
    prefix="/api/v1/reviews",
    tags=["Reviews & Ratings"]
)


class ReviewCreate(BaseModel):
    event_id: int = Field(..., gt=0)
    rating: int = Field(..., ge=1, le=5)
    review_text: str | None = Field(default=None, max_length=2000)


class ReviewUpdate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    review_text: str | None = Field(default=None, max_length=2000)


class ReviewResponse(BaseModel):
    id: int
    user_id: int
    event_id: int
    rating: int
    review_text: str | None
    created_at: datetime

    class Config:
        from_attributes = True


def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials,
    db: Session
):
    user_id = get_current_user_id(credentials)

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User account not found."
        )

    return user


@router.post(
    "/",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED
)
def create_review(
    data: ReviewCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user = get_authenticated_user(credentials, db)

    event = db.query(Event).filter(
        Event.id == data.event_id
    ).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found."
        )

    if event.event_date > datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="You can review an event only after it has taken place."
        )

    confirmed_booking = db.query(Booking).filter(
        Booking.user_id == user.id,
        Booking.event_id == event.id,
        Booking.booking_status == "CONFIRMED"
    ).first()

    if not confirmed_booking:
        raise HTTPException(
            status_code=403,
            detail="A confirmed booking is required to review this event."
        )

    existing_review = db.query(Review).filter(
        Review.user_id == user.id,
        Review.event_id == event.id
    ).first()

    if existing_review:
        raise HTTPException(
            status_code=409,
            detail="You have already reviewed this event."
        )

    review = Review(
        user_id=user.id,
        event_id=event.id,
        rating=data.rating,
        review_text=data.review_text
    )

    try:
        db.add(review)
        db.commit()
        db.refresh(review)
        return review
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save review."
        )


@router.get(
    "/event/{event_id}",
    response_model=list[ReviewResponse]
)
def get_event_reviews(
    event_id: int,
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(
        Event.id == event_id
    ).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found."
        )

    return (
        db.query(Review)
        .filter(Review.event_id == event_id)
        .order_by(Review.created_at.desc())
        .all()
    )


@router.get("/event/{event_id}/summary")
def get_event_rating_summary(
    event_id: int,
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(
        Event.id == event_id
    ).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found."
        )

    reviews = db.query(Review).filter(
        Review.event_id == event_id
    ).all()

    total_reviews = len(reviews)

    average_rating = (
        round(sum(review.rating for review in reviews) / total_reviews, 2)
        if total_reviews
        else 0
    )

    return {
        "event_id": event_id,
        "average_rating": average_rating,
        "total_reviews": total_reviews
    }


@router.put("/{review_id}", response_model=ReviewResponse)
def update_review(
    review_id: int,
    data: ReviewUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user = get_authenticated_user(credentials, db)

    review = db.query(Review).filter(
        Review.id == review_id
    ).first()

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review not found."
        )

    if review.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You can update only your own review."
        )

    updates = data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(review, field, value)

    try:
        db.commit()
        db.refresh(review)
        return review
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update review."
        )


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user = get_authenticated_user(credentials, db)

    review = db.query(Review).filter(
        Review.id == review_id
    ).first()

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review not found."
        )

    if review.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You can delete only your own review."
        )

    try:
        db.delete(review)
        db.commit()

        return {
            "message": "Review deleted successfully."
        }
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not delete review."
        )

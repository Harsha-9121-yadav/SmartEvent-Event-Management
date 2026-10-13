from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import Booking, Event, User, Notification, Coupon
from schemas import BookingCreate, BookingResponse
from security import bearer_scheme, get_current_user_id
from role_dependencies import require_organizer


router = APIRouter(
    prefix="/api/v1/bookings",
    tags=["Bookings"]
)


# =========================================
# COUPON REQUEST SCHEMA
# =========================================

class ApplyCouponRequest(BaseModel):
    coupon_code: str = Field(
        ...,
        min_length=3,
        max_length=50
    )


# =========================================
# CREATE BOOKING
# =========================================

@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED
)
def create_booking(
    booking_data: BookingCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    event = db.query(Event).filter(
        Event.id == booking_data.event_id
    ).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found."
        )

    if event.event_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Cannot book a cancelled event."
        )

    if event.available_tickets < booking_data.ticket_quantity:
        raise HTTPException(
            status_code=400,
            detail="Not enough tickets available."
        )

    total_price = round(
        float(event.ticket_price) * booking_data.ticket_quantity,
        2
    )

    # Inventory is reduced only after successful payment.
    new_booking = Booking(
        user_id=user_id,
        event_id=event.id,
        ticket_quantity=booking_data.ticket_quantity,
        total_price=total_price,
        coupon_id=None,
        discount_amount=0.0,
        final_amount=total_price,
        booking_status="PENDING"
    )

    try:
        db.add(new_booking)
        db.commit()
        db.refresh(new_booking)

        return new_booking

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create booking."
        )


# =========================================
# APPLY COUPON TO A PENDING BOOKING
# =========================================

@router.post("/{booking_id}/apply-coupon")
def apply_coupon(
    booking_id: int,
    coupon_data: ApplyCouponRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found."
        )

    if booking.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You cannot modify another user's booking."
        )

    if booking.booking_status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="Coupons can only be applied to pending bookings."
        )

    coupon_code = coupon_data.coupon_code.strip().upper()

    coupon = db.query(Coupon).filter(
        Coupon.coupon_code == coupon_code
    ).first()

    if not coupon:
        raise HTTPException(
            status_code=404,
            detail="Invalid coupon code."
        )

    if not coupon.is_active:
        raise HTTPException(
            status_code=400,
            detail="This coupon is inactive."
        )

    if coupon.expiry_date <= datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="This coupon has expired."
        )

    if coupon.used_count >= coupon.usage_limit:
        raise HTTPException(
            status_code=400,
            detail="This coupon has reached its usage limit."
        )

    original_amount = round(
        float(booking.total_price),
        2
    )

    if original_amount < float(coupon.minimum_booking_amount):
        raise HTTPException(
            status_code=400,
            detail=(
                "Minimum booking amount for this coupon is "
                f"₹{float(coupon.minimum_booking_amount):.2f}."
            )
        )

    discount_type = coupon.discount_type.upper()
    discount_value = float(coupon.discount_value)

    if discount_type == "PERCENTAGE":
        if discount_value < 0 or discount_value > 100:
            raise HTTPException(
                status_code=400,
                detail="Invalid percentage discount configured for this coupon."
            )

        discount_amount = (
            original_amount * discount_value / 100
        )

    elif discount_type == "FIXED":
        if discount_value < 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid fixed discount configured for this coupon."
            )

        discount_amount = discount_value

    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported coupon discount type."
        )

    # Never allow a discount greater than the booking amount.
    discount_amount = round(
        min(discount_amount, original_amount),
        2
    )

    final_amount = round(
        original_amount - discount_amount,
        2
    )

    try:
        booking.coupon_id = coupon.id
        booking.discount_amount = discount_amount
        booking.final_amount = final_amount

        db.commit()
        db.refresh(booking)

        return {
            "message": "Coupon applied successfully.",
            "booking_id": booking.id,
            "coupon_id": coupon.id,
            "coupon_code": coupon.coupon_code,
            "discount_type": coupon.discount_type,
            "discount_value": coupon.discount_value,
            "original_amount": original_amount,
            "discount_amount": discount_amount,
            "final_amount": final_amount
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not apply coupon."
        )


# =========================================
# REMOVE COUPON FROM A PENDING BOOKING
# =========================================

@router.delete("/{booking_id}/remove-coupon")
def remove_coupon(
    booking_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found."
        )

    if booking.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You cannot modify another user's booking."
        )

    if booking.booking_status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="Coupons can only be removed from pending bookings."
        )

    if booking.coupon_id is None:
        raise HTTPException(
            status_code=400,
            detail="No coupon is applied to this booking."
        )

    try:
        booking.coupon_id = None
        booking.discount_amount = 0.0
        booking.final_amount = round(
            float(booking.total_price),
            2
        )

        db.commit()
        db.refresh(booking)

        return {
            "message": "Coupon removed successfully.",
            "booking_id": booking.id,
            "coupon_id": None,
            "discount_amount": booking.discount_amount,
            "final_amount": booking.final_amount
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not remove coupon."
        )


# =========================================
# GET CURRENT USER'S BOOKINGS
# =========================================

@router.get(
    "/my-bookings",
    response_model=list[BookingResponse]
)
def get_my_bookings(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == user_id)
        .order_by(Booking.created_at.desc())
        .all()
    )

    return bookings


# =========================================
# ORGANIZER: VIEW BOOKINGS
# =========================================

@router.get(
    "/organizer/bookings",
    response_model=list[BookingResponse]
)
def get_organizer_bookings(
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    bookings = (
        db.query(Booking)
        .join(Event, Booking.event_id == Event.id)
        .filter(Event.organizer_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )

    return bookings


# =========================================
# ORGANIZER: EVENT INSIGHTS
# =========================================

@router.get("/organizer/insights")
def get_organizer_insights(
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    events = (
        db.query(Event)
        .filter(Event.organizer_id == current_user.id)
        .order_by(Event.event_date.asc())
        .all()
    )

    total_tickets_sold = 0
    total_revenue = 0.0
    event_insights = []

    for event in events:
        confirmed_bookings = (
            db.query(Booking)
            .filter(
                Booking.event_id == event.id,
                Booking.booking_status == "CONFIRMED"
            )
            .all()
        )

        tickets_sold = sum(
            booking.ticket_quantity
            for booking in confirmed_bookings
        )

        # Revenue reflects the final amount after discounts.
        revenue = sum(
            float(
                booking.final_amount
                if booking.final_amount is not None
                else booking.total_price
            )
            for booking in confirmed_bookings
        )

        total_tickets_sold += tickets_sold
        total_revenue += revenue

        event_insights.append({
            "event_id": event.id,
            "event_title": event.title,
            "event_date": event.event_date,
            "total_tickets": event.total_tickets,
            "available_tickets": event.available_tickets,
            "tickets_sold": tickets_sold,
            "revenue": round(revenue, 2)
        })

    return {
        "organizer_id": current_user.id,
        "total_events": len(events),
        "total_tickets_sold": total_tickets_sold,
        "total_revenue": round(total_revenue, 2),
        "events": event_insights
    }


# =========================================
# GET ONE BOOKING
# =========================================

@router.get(
    "/{booking_id}",
    response_model=BookingResponse
)
def get_booking(
    booking_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found."
        )

    if booking.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You cannot access another user's booking."
        )

    return booking


# =========================================
# CANCEL BOOKING
# =========================================

@router.patch(
    "/{booking_id}/cancel",
    response_model=BookingResponse
)
def cancel_booking(
    booking_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found."
        )

    if booking.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You cannot cancel another user's booking."
        )

    if booking.booking_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Booking is already cancelled."
        )

    if booking.booking_status not in ("PENDING", "CONFIRMED"):
        raise HTTPException(
            status_code=400,
            detail="This booking cannot be cancelled."
        )

    event = (
        db.query(Event)
        .filter(Event.id == booking.event_id)
        .first()
    )

    # Restore inventory only for confirmed bookings.
    if event and booking.booking_status == "CONFIRMED":
        event.available_tickets += booking.ticket_quantity

    booking.booking_status = "CANCELLED"

    notification = Notification(
        user_id=user_id,
        title="Booking Cancelled",
        message=f"Your booking #{booking.id} has been cancelled.",
        type="BOOKING",
        is_read=False
    )

    try:
        db.add(notification)
        db.commit()
        db.refresh(booking)

        return booking

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not cancel booking."
        )
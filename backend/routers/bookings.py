import os
import uuid

import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models import Booking, Event, User, Notification, Ticket
from schemas import BookingCreate, BookingResponse
from security import bearer_scheme, get_current_user_id
from role_dependencies import require_organizer


router = APIRouter(
    prefix="/api/v1/bookings",
    tags=["Bookings"]
)


@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED
)
def create_booking(
    booking_data: BookingCreate,
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    event = db.query(Event).filter(
        Event.id == booking_data.event_id
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    if event.available_tickets < booking_data.ticket_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough tickets available"
        )

    total_price = (
        event.ticket_price *
        booking_data.ticket_quantity
    )

    new_booking = Booking(
        user_id=user_id,
        event_id=event.id,
        ticket_quantity=booking_data.ticket_quantity,
        total_price=total_price,
        booking_status="CONFIRMED"
    )

    event.available_tickets -= (
        booking_data.ticket_quantity
    )

    db.add(new_booking)

    db.flush()

    ticket_code = (
        f"SME-{uuid.uuid4().hex[:12].upper()}"
    )

    os.makedirs(
        "static/qrcodes",
        exist_ok=True
    )

    qr_file_name = f"{ticket_code}.png"

    qr_file_path = os.path.join(
        "static",
        "qrcodes",
        qr_file_name
    )

    qr_data = (
        f"SmartEvent Ticket\n"
        f"Ticket Code: {ticket_code}\n"
        f"Booking ID: {new_booking.id}\n"
        f"Event ID: {event.id}"
    )

    qr_image = qrcode.make(qr_data)

    qr_image.save(qr_file_path)

    qr_code_url = (
        f"/static/qrcodes/{qr_file_name}"
    )

    new_ticket = Ticket(
        booking_id=new_booking.id,
        ticket_code=ticket_code,
        qr_code_url=qr_code_url
    )

    db.add(new_ticket)

    notification = Notification(
        user_id=user_id,
        title="Booking Confirmed",
        message=(
            f"Your booking for '{event.title}' "
            f"has been confirmed. "
            f"You booked "
            f"{booking_data.ticket_quantity} ticket(s). "
            f"Ticket Code: {ticket_code}"
        ),
        type="BOOKING",
        is_read=False
    )

    db.add(notification)

    db.commit()

    db.refresh(new_booking)

    return new_booking


@router.get(
    "/my-bookings",
    response_model=list[BookingResponse]
)
def get_my_bookings(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    bookings = (
        db.query(Booking)
        .filter(
            Booking.user_id == user_id
        )
        .order_by(
            Booking.created_at.desc()
        )
        .all()
    )

    return bookings


@router.get(
    "/organizer/bookings",
    response_model=list[BookingResponse]
)
def get_organizer_bookings(
    current_user: User = Depends(
        require_organizer
    ),
    db: Session = Depends(get_db)
):
    bookings = (
        db.query(Booking)
        .join(
            Event,
            Booking.event_id == Event.id
        )
        .filter(
            Event.organizer_id == current_user.id
        )
        .order_by(
            Booking.created_at.desc()
        )
        .all()
    )

    return bookings


@router.get(
    "/organizer/insights"
)
def get_organizer_insights(
    current_user: User = Depends(
        require_organizer
    ),
    db: Session = Depends(get_db)
):
    events = (
        db.query(Event)
        .filter(
            Event.organizer_id == current_user.id
        )
        .order_by(
            Event.event_date.asc()
        )
        .all()
    )

    insights = []

    for event in events:
        bookings = (
            db.query(Booking)
            .filter(
                Booking.event_id == event.id
            )
            .all()
        )

        confirmed_bookings = [
            booking
            for booking in bookings
            if booking.booking_status == "CONFIRMED"
        ]

        booking_count = len(
            confirmed_bookings
        )

        total_tickets_sold = sum(
            booking.ticket_quantity
            for booking in confirmed_bookings
        )

        total_revenue = sum(
            booking.total_price
            for booking in confirmed_bookings
        )

        insights.append(
            {
                "event_id": event.id,
                "event_title": event.title,
                "event_status": event.event_status,
                "total_tickets": event.total_tickets,
                "tickets_sold": total_tickets_sold,
                "remaining_tickets": event.available_tickets,
                "booking_count": booking_count,
                "total_revenue": total_revenue
            }
        )

    return {
        "organizer_id": current_user.id,
        "total_events": len(events),
        "total_tickets_sold": sum(
            item["tickets_sold"]
            for item in insights
        ),
        "total_revenue": sum(
            item["total_revenue"]
            for item in insights
        ),
        "events": insights
    }


@router.get(
    "/{booking_id}",
    response_model=BookingResponse
)
def get_booking(
    booking_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    booking = (
        db.query(Booking)
        .filter(
            Booking.id == booking_id
        )
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    if booking.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not allowed to access "
                "this booking"
            )
        )

    return booking


@router.patch(
    "/{booking_id}/cancel",
    response_model=BookingResponse
)
def cancel_booking(
    booking_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    booking = (
        db.query(Booking)
        .filter(
            Booking.id == booking_id
        )
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    if booking.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not allowed to cancel "
                "this booking"
            )
        )

    if booking.booking_status == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is already cancelled"
        )

    if booking.booking_status != "CONFIRMED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only confirmed bookings "
                "can be cancelled"
            )
        )

    event = (
        db.query(Event)
        .filter(
            Event.id == booking.event_id
        )
        .first()
    )

    if event:
        event.available_tickets += (
            booking.ticket_quantity
        )

    booking.booking_status = "CANCELLED"

    notification = Notification(
        user_id=user_id,
        title="Booking Cancelled",
        message=(
            f"Your booking #{booking.id} "
            f"has been cancelled."
        ),
        type="BOOKING",
        is_read=False
    )

    db.add(notification)

    db.commit()

    db.refresh(booking)

    return booking
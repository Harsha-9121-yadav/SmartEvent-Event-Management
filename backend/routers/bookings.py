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

    # Check user
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check event
    event = db.query(Event).filter(
        Event.id == booking_data.event_id
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    # Check ticket availability
    if event.available_tickets < booking_data.ticket_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough tickets available"
        )

    # Calculate total price
    total_price = (
        event.ticket_price *
        booking_data.ticket_quantity
    )

    # Create booking
    new_booking = Booking(
        user_id=user_id,
        event_id=event.id,
        ticket_quantity=booking_data.ticket_quantity,
        total_price=total_price,
        booking_status="CONFIRMED"
    )

    # Reduce available tickets
    event.available_tickets -= (
        booking_data.ticket_quantity
    )

    db.add(new_booking)

    # Get booking ID before creating ticket
    db.flush()

    # =========================
    # GENERATE QR TICKET
    # =========================

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

    # Create ticket record
    new_ticket = Ticket(
        booking_id=new_booking.id,
        ticket_code=ticket_code,
        qr_code_url=qr_code_url
    )

    db.add(new_ticket)

    # =========================
    # BOOKING NOTIFICATION
    # =========================

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

    # Save everything
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

    # Check ownership
    if booking.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not allowed to cancel "
                "this booking"
            )
        )

    # Already cancelled
    if booking.booking_status == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is already cancelled"
        )

    # Only confirmed bookings can be cancelled
    if booking.booking_status != "CONFIRMED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only confirmed bookings "
                "can be cancelled"
            )
        )

    # Restore event tickets
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

    # Update booking status
    booking.booking_status = "CANCELLED"

    # Booking cancellation notification
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
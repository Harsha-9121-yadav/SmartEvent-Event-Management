from datetime import datetime
from uuid import uuid4
import os

import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Booking,
    Payment,
    User,
    Event,
    Ticket,
    Notification,
    Coupon,
)
from security import bearer_scheme, get_current_user_id


router = APIRouter(
    prefix="/api/v1/payments",
    tags=["Payments"]
)


# =========================================
# PAYMENT SCHEMAS
# =========================================

class PaymentCreate(BaseModel):
    booking_id: int = Field(..., gt=0)
    payment_method: str = Field(..., min_length=1, max_length=30)


class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    payment_method: str
    payment_status: str
    transaction_id: str | None
    amount: float
    created_at: datetime

    class Config:
        from_attributes = True


# =========================================
# CREATE SIMULATED PAYMENT
# =========================================

@router.post(
    "/",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED
)
def create_payment(
    payment_data: PaymentCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    current_user = db.query(User).filter(
        User.id == user_id
    ).first()

    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="User account not found."
        )

    booking = db.query(Booking).filter(
        Booking.id == payment_data.booking_id
    ).first()

    if booking is None:
        raise HTTPException(
            status_code=404,
            detail="Booking not found."
        )

    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot pay for another user's booking."
        )

    if booking.booking_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Cannot pay for a cancelled booking."
        )

    if booking.booking_status == "CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail="This booking is already confirmed."
        )

    if booking.booking_status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="This booking is not awaiting payment."
        )

    existing_success = db.query(Payment).filter(
        Payment.booking_id == booking.id,
        Payment.payment_status == "SUCCESS"
    ).first()

    if existing_success:
        raise HTTPException(
            status_code=400,
            detail="This booking has already been paid."
        )

    method = payment_data.payment_method.strip().upper()

    allowed_methods = {
        "UPI",
        "CARD",
        "NETBANKING",
        "CASH"
    }

    if method not in allowed_methods:
        raise HTTPException(
            status_code=400,
            detail="Choose UPI, CARD, NETBANKING, or CASH."
        )

    # Lock the event row where supported by the database.
    event = db.query(Event).filter(
        Event.id == booking.event_id
    ).with_for_update().first()

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found."
        )

    if event.event_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="This event has been cancelled."
        )

    if event.available_tickets < booking.ticket_quantity:
        raise HTTPException(
            status_code=400,
            detail=(
                "Not enough tickets remain. "
                "Please cancel this booking."
            )
        )

    # =====================================
    # VALIDATE APPLIED COUPON
    # =====================================

    coupon = None

    if booking.coupon_id is not None:
        coupon = db.query(Coupon).filter(
            Coupon.id == booking.coupon_id
        ).with_for_update().first()

        if coupon is None:
            raise HTTPException(
                status_code=400,
                detail="The applied coupon no longer exists."
            )

        if not coupon.is_active:
            raise HTTPException(
                status_code=400,
                detail="The applied coupon is inactive."
            )

        if coupon.expiry_date <= datetime.utcnow():
            raise HTTPException(
                status_code=400,
                detail="The applied coupon has expired."
            )

        if coupon.used_count >= coupon.usage_limit:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The applied coupon has reached "
                    "its usage limit."
                )
            )

    # Use the discounted amount when available.
    # Existing bookings without a final_amount remain supported.
    payment_amount = round(
        float(
            booking.final_amount
            if booking.final_amount is not None
            else booking.total_price
        ),
        2
    )

    if payment_amount < 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid booking payment amount."
        )

    # =====================================
    # GENERATE QR TICKET
    # =====================================

    ticket_code = f"SME-{uuid4().hex[:12].upper()}"

    qr_directory = os.path.join(
        "static",
        "qrcodes"
    )

    os.makedirs(
        qr_directory,
        exist_ok=True
    )

    qr_file_name = f"{ticket_code}.png"

    qr_file_path = os.path.join(
        qr_directory,
        qr_file_name
    )

    qr_code_url = f"/static/qrcodes/{qr_file_name}"

    qr_data = (
        f"SmartEvent Ticket\n"
        f"Ticket Code: {ticket_code}\n"
        f"Booking ID: {booking.id}\n"
        f"Event ID: {event.id}"
    )

    try:
        qr_image = qrcode.make(qr_data)
        qr_image.save(qr_file_path)

        # =================================
        # CREATE PAYMENT RECORD
        # =================================

        payment = Payment(
            booking_id=booking.id,
            payment_method=method,
            payment_status="SUCCESS",
            transaction_id=f"SIM-{uuid4().hex[:16].upper()}",
            amount=payment_amount
        )

        # =================================
        # CREATE DIGITAL TICKET
        # =================================

        ticket = Ticket(
            booking_id=booking.id,
            ticket_code=ticket_code,
            qr_code_url=qr_code_url
        )

        # =================================
        # CREATE NOTIFICATIONS
        # =================================

        payment_notification = Notification(
            user_id=user_id,
            title="Payment Successful",
            message=(
                f"Your simulated payment for booking "
                f"#{booking.id} was successful. "
                f"Amount: ₹{payment_amount:.2f}. "
                f"Transaction: {payment.transaction_id}"
            ),
            type="PAYMENT",
            is_read=False
        )

        booking_notification = Notification(
            user_id=user_id,
            title="Booking Confirmed",
            message=(
                f"Your booking for '{event.title}' "
                f"is confirmed. "
                f"Ticket code: {ticket_code}"
            ),
            type="BOOKING",
            is_read=False
        )

        # =================================
        # UPDATE INVENTORY AND BOOKING
        # =================================

        event.available_tickets -= booking.ticket_quantity

        booking.booking_status = "CONFIRMED"

        # Count coupon usage only when payment succeeds.
        if coupon is not None:
            coupon.used_count += 1

        db.add_all([
            payment,
            ticket,
            payment_notification,
            booking_notification
        ])

        # All database changes are committed together.
        db.commit()
        db.refresh(payment)

        return payment

    except HTTPException:
        db.rollback()

        if os.path.exists(qr_file_path):
            try:
                os.remove(qr_file_path)
            except OSError:
                pass

        raise

    except Exception:
        db.rollback()

        # Remove the QR file if the database transaction fails.
        if os.path.exists(qr_file_path):
            try:
                os.remove(qr_file_path)
            except OSError:
                pass

        raise HTTPException(
            status_code=500,
            detail=(
                "Payment could not be completed. "
                "Please try again."
            )
        )


# =========================================
# GET PAYMENT DETAILS
# =========================================

@router.get(
    "/{payment_id}",
    response_model=PaymentResponse
)
def get_payment(
    payment_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials)

    payment = (
        db.query(Payment)
        .join(
            Booking,
            Payment.booking_id == Booking.id
        )
        .filter(
            Payment.id == payment_id,
            Booking.user_id == user_id
        )
        .first()
    )

    if payment is None:
        raise HTTPException(
            status_code=404,
            detail="Payment not found."
        )

    return payment

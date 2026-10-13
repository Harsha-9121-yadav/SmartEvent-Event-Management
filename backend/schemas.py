from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


# =========================
# USER SCHEMAS
# =========================

class UserCreate(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=100
    )

    email: EmailStr

    password: str = Field(
        min_length=6,
        max_length=100
    )


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: Literal[
        "USER",
        "ORGANIZER",
        "ADMIN"
    ]
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


# =========================
# EVENT SCHEMAS
# =========================

class EventCreate(BaseModel):
    title: str = Field(
        min_length=2,
        max_length=200
    )

    description: str = Field(
        min_length=5
    )

    category: Literal[
        "Music",
        "Tech",
        "Sports",
        "Business"
    ]

    location: str = Field(
        min_length=2,
        max_length=200
    )

    event_date: datetime

    ticket_price: float = Field(
        gt=0
    )

    banner_image: str | None = None

    total_tickets: int = Field(
        gt=0
    )


class EventResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    location: str
    event_date: datetime
    ticket_price: float
    banner_image: str | None
    total_tickets: int
    available_tickets: int

    organizer_id: int | None

    event_status: Literal[
        "UPCOMING",
        "ONGOING",
        "COMPLETED",
        "CANCELLED"
    ]

    created_at: datetime

    class Config:
        from_attributes = True


# =========================
# BOOKING SCHEMAS
# =========================

class BookingCreate(BaseModel):
    event_id: int

    ticket_quantity: int = Field(
        gt=0
    )


class BookingResponse(BaseModel):
    id: int
    user_id: int
    event_id: int
    ticket_quantity: int

    # Original booking amount before discount
    total_price: float

    # Applied coupon and discount information
    coupon_id: int | None = None
    discount_amount: float = 0.0
    final_amount: float | None = None

    booking_status: str
    created_at: datetime

    class Config:
        from_attributes = True


# =========================
# TICKET SCHEMAS
# =========================

class TicketResponse(BaseModel):
    id: int
    booking_id: int
    ticket_code: str
    qr_code_url: str | None
    created_at: datetime

    class Config:
        from_attributes = True


# =========================
# NOTIFICATION SCHEMAS
# =========================

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

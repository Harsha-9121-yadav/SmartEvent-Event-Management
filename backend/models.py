
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    Boolean,
    DateTime,
    ForeignKey
)
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


# =========================
# USER MODEL
# =========================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="USER", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    bookings = relationship(
        "Booking",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    organizer_events = relationship("Event", back_populates="organizer")
    reviews = relationship(
        "Review",
        back_populates="user",
        cascade="all, delete-orphan"
    )


# =========================
# EVENT MODEL
# =========================

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    location = Column(String(200), nullable=False)
    event_date = Column(DateTime, nullable=False)
    ticket_price = Column(Float, nullable=False)
    banner_image = Column(String(500), nullable=True)
    total_tickets = Column(Integer, nullable=False)
    available_tickets = Column(Integer, nullable=False)
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    event_status = Column(String(20), default="UPCOMING", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    organizer = relationship("User", back_populates="organizer_events")
    bookings = relationship("Booking", back_populates="event")
    reviews = relationship(
        "Review",
        back_populates="event",
        cascade="all, delete-orphan"
    )


# =========================
# COUPON MODEL
# =========================

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    coupon_code = Column(String(50), unique=True, nullable=False, index=True)
    discount_type = Column(String(20), nullable=False)
    discount_value = Column(Float, nullable=False)
    minimum_booking_amount = Column(Float, default=0.0, nullable=False)
    expiry_date = Column(DateTime, nullable=False)
    usage_limit = Column(Integer, nullable=False)
    used_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    bookings = relationship("Booking", back_populates="coupon")


# =========================
# BOOKING MODEL
# =========================

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    ticket_quantity = Column(Integer, nullable=False)
    total_price = Column(Float, nullable=False)
    booking_status = Column(String(20), default="PENDING", nullable=False)

    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=True)
    discount_amount = Column(Float, default=0.0, nullable=False)
    final_amount = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="bookings")
    event = relationship("Event", back_populates="bookings")
    coupon = relationship("Coupon", back_populates="bookings")

    ticket = relationship(
        "Ticket",
        back_populates="booking",
        uselist=False,
        cascade="all, delete-orphan"
    )
    payments = relationship(
        "Payment",
        back_populates="booking",
        cascade="all, delete-orphan"
    )


# =========================
# TICKET MODEL
# =========================

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(
        Integer,
        ForeignKey("bookings.id"),
        unique=True,
        nullable=False
    )
    ticket_code = Column(String(100), unique=True, nullable=False, index=True)
    qr_code_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="ticket")


# =========================
# NOTIFICATION MODEL
# =========================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(20), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


# =========================
# PAYMENT MODEL
# =========================

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    payment_method = Column(String(30), nullable=False)
    payment_status = Column(String(20), default="PENDING", nullable=False)
    transaction_id = Column(String(100), unique=True, nullable=True)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="payments")


# =========================
# REVIEW MODEL
# =========================

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    review_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reviews")
    event = relationship("Event", back_populates="reviews")


from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import User, Event, Booking
from role_dependencies import require_admin

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin Dashboard"]
)


def apply_date_filter(query, column, start_date, end_date):
    """Apply an inclusive start and end date filter."""
    if start_date:
        query = query.filter(
            column >= datetime.combine(start_date, time.min)
        )

    if end_date:
        query = query.filter(
            column < datetime.combine(
                end_date + timedelta(days=1),
                time.min
            )
        )

    return query


def is_successful_booking(booking):
    """Count revenue and tickets only for successful bookings."""
    return booking.booking_status.upper() in (
        "CONFIRMED",
        "COMPLETED"
    )


# =========================
# ADMIN OVERVIEW
# =========================

@router.get("/overview")
def admin_overview(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    users_query = apply_date_filter(
        db.query(User),
        User.created_at,
        start_date,
        end_date
    )

    events_query = apply_date_filter(
        db.query(Event),
        Event.created_at,
        start_date,
        end_date
    )

    bookings_query = apply_date_filter(
        db.query(Booking),
        Booking.created_at,
        start_date,
        end_date
    )

    bookings = bookings_query.all()

    successful_bookings = [
        booking for booking in bookings
        if is_successful_booking(booking)
    ]

    total_tickets = sum(
        booking.ticket_quantity
        for booking in successful_bookings
    )

    total_revenue = sum(
        float(booking.total_price or 0)
        for booking in successful_bookings
    )

    return {
        "total_users": users_query.count(),
        "total_events": events_query.count(),
        "total_tickets_sold": total_tickets,
        "total_bookings": len(bookings),
        "total_revenue": round(total_revenue, 2),
        "start_date": start_date,
        "end_date": end_date
    }


# =========================
# ALL USERS
# =========================

@router.get("/users")
def admin_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).order_by(User.id.desc()).all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at
        }
        for user in users
    ]


# =========================
# ALL EVENTS
# =========================

@router.get("/events")
def admin_events(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    events = (
        db.query(Event)
        .order_by(Event.event_date.desc())
        .all()
    )

    return [
        {
            "id": event.id,
            "title": event.title,
            "category": event.category,
            "location": event.location,
            "event_date": event.event_date,
            "event_status": event.event_status,
            "organizer_id": event.organizer_id,
            "total_tickets": event.total_tickets,
            "available_tickets": event.available_tickets
        }
        for event in events
    ]


# =========================
# ALL BOOKINGS
# =========================

@router.get("/bookings")
def admin_bookings(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = apply_date_filter(
        db.query(Booking),
        Booking.created_at,
        start_date,
        end_date
    )

    bookings = (
        query.order_by(Booking.created_at.desc())
        .all()
    )

    return [
        {
            "id": booking.id,
            "user_id": booking.user_id,
            "event_id": booking.event_id,
            "ticket_quantity": booking.ticket_quantity,
            "total_price": booking.total_price,
            "booking_status": booking.booking_status,
            "created_at": booking.created_at
        }
        for booking in bookings
    ]


# =========================
# DAILY TICKET SALES
# =========================

@router.get("/analytics/daily-ticket-sales")
def daily_ticket_sales(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Booking).filter(
        func.upper(Booking.booking_status).in_(
            ["CONFIRMED", "COMPLETED"]
        )
    )

    query = apply_date_filter(
        query,
        Booking.created_at,
        start_date,
        end_date
    )

    bookings = query.all()
    daily_data = {}

    for booking in bookings:
        day = booking.created_at.date().isoformat()

        if day not in daily_data:
            daily_data[day] = {
                "date": day,
                "tickets_sold": 0,
                "revenue": 0
            }

        daily_data[day]["tickets_sold"] += booking.ticket_quantity
        daily_data[day]["revenue"] += float(
            booking.total_price or 0
        )

    results = sorted(
        daily_data.values(),
        key=lambda item: item["date"]
    )

    for item in results:
        item["revenue"] = round(item["revenue"], 2)

    return results


# =========================
# MONTHLY BOOKING TRENDS
# =========================

@router.get("/analytics/monthly-booking-trends")
def monthly_booking_trends(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = apply_date_filter(
        db.query(Booking),
        Booking.created_at,
        start_date,
        end_date
    )

    bookings = query.all()
    monthly_data = {}

    for booking in bookings:
        month = booking.created_at.strftime("%Y-%m")

        if month not in monthly_data:
            monthly_data[month] = {
                "month": month,
                "bookings": 0,
                "revenue": 0
            }

        monthly_data[month]["bookings"] += 1

        if is_successful_booking(booking):
            monthly_data[month]["revenue"] += float(
                booking.total_price or 0
            )

    results = sorted(
        monthly_data.values(),
        key=lambda item: item["month"]
    )

    for item in results:
        item["revenue"] = round(item["revenue"], 2)

    return results


# =========================
# MOST POPULAR EVENTS
# =========================

@router.get("/analytics/popular-events")
def popular_events(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    rows = (
        db.query(
            Event.id,
            Event.title,
            func.coalesce(
                func.sum(Booking.ticket_quantity), 0
            ).label("tickets_sold"),
            func.count(Booking.id).label("booking_count")
        )
        .outerjoin(
            Booking,
            Booking.event_id == Event.id
        )
        .filter(
            (Booking.id.is_(None))
            | func.upper(Booking.booking_status).in_(
                ["CONFIRMED", "COMPLETED"]
            )
        )
        .group_by(Event.id, Event.title)
        .order_by(
            func.coalesce(
                func.sum(Booking.ticket_quantity), 0
            ).desc()
        )
        .limit(10)
        .all()
    )

    return [
        {
            "event_id": row.id,
            "event_title": row.title,
            "tickets_sold": int(row.tickets_sold or 0),
            "booking_count": int(row.booking_count or 0)
        }
        for row in rows
    ]


# =========================
# TOP REVENUE EVENTS
# =========================

@router.get("/analytics/top-revenue-events")
def top_revenue_events(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    rows = (
        db.query(
            Event.id,
            Event.title,
            func.coalesce(
                func.sum(Booking.total_price), 0
            ).label("revenue")
        )
        .outerjoin(
            Booking,
            Booking.event_id == Event.id
        )
        .filter(
            (Booking.id.is_(None))
            | func.upper(Booking.booking_status).in_(
                ["CONFIRMED", "COMPLETED"]
            )
        )
        .group_by(Event.id, Event.title)
        .order_by(
            func.coalesce(
                func.sum(Booking.total_price), 0
            ).desc()
        )
        .limit(10)
        .all()
    )

    return [
        {
            "event_id": row.id,
            "event_title": row.title,
            "revenue": round(float(row.revenue or 0), 2)
        }
        for row in rows
    ]
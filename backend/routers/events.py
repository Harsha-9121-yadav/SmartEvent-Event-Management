
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Event, User, Booking, Notification
from schemas import EventCreate, EventResponse
from role_dependencies import require_organizer


router = APIRouter(
    prefix="/api/v1/events",
    tags=["Events"]
)


def refresh_event_status(event):
    """Refresh date-based status without overriding cancellation or completion."""
    if event.event_status in ("CANCELLED", "COMPLETED"):
        return

    now = datetime.utcnow()

    if event.event_date > now:
        event.event_status = "UPCOMING"
    else:
        event.event_status = "ONGOING"


def notify_event_bookers(db, event, title, message, notification_type):
    """Notify users who have bookings for this event."""
    user_ids = (
        db.query(Booking.user_id)
        .filter(Booking.event_id == event.id)
        .distinct()
        .all()
    )

    for (user_id,) in user_ids:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            is_read=False
        )
        db.add(notification)


# =========================
# CREATE EVENT
# =========================

@router.post("", response_model=EventResponse, status_code=201)
def create_event(
    event_data: EventCreate,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    new_event = Event(
        title=event_data.title,
        description=event_data.description,
        category=event_data.category,
        location=event_data.location,
        event_date=event_data.event_date,
        ticket_price=event_data.ticket_price,
        banner_image=event_data.banner_image,
        total_tickets=event_data.total_tickets,
        available_tickets=event_data.total_tickets,
        organizer_id=current_user.id,
        event_status="UPCOMING"
    )

    refresh_event_status(new_event)

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    return new_event


# =========================
# SEARCH, FILTER, SORT EVENTS
# =========================

@router.get("", response_model=list[EventResponse])
def get_events(
    category: str | None = Query(default=None),
    search: str | None = Query(default=None, description="Search event title"),
    location: str | None = Query(default=None),
    start_date: datetime | None = Query(default=None),
    end_date: datetime | None = Query(default=None),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    sort_by: str = Query(
        default="date",
        description="Sort by date, price, or popularity"
    ),
    sort_order: str = Query(default="asc", description="asc or desc"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be before or equal to end_date."
        )

    if min_price is not None and max_price is not None:
        if min_price > max_price:
            raise HTTPException(
                status_code=400,
                detail="min_price cannot exceed max_price."
            )

    sort_by = sort_by.strip().lower()
    sort_order = sort_order.strip().lower()

    if sort_by not in {"date", "price", "popularity"}:
        raise HTTPException(
            status_code=400,
            detail="sort_by must be date, price, or popularity."
        )

    if sort_order not in {"asc", "desc"}:
        raise HTTPException(
            status_code=400,
            detail="sort_order must be asc or desc."
        )

    query = db.query(Event)

    if category:
        query = query.filter(
            Event.category.ilike(category.strip())
        )

    if search:
        query = query.filter(
            Event.title.ilike(f"%{search.strip()}%")
        )

    if location:
        query = query.filter(
            Event.location.ilike(f"%{location.strip()}%")
        )

    if start_date:
        query = query.filter(Event.event_date >= start_date)

    if end_date:
        query = query.filter(Event.event_date <= end_date)

    if min_price is not None:
        query = query.filter(Event.ticket_price >= min_price)

    if max_price is not None:
        query = query.filter(Event.ticket_price <= max_price)

    # Popularity is based on the number of tickets in confirmed bookings.
    if sort_by == "popularity":
        popularity_query = (
            db.query(
                Booking.event_id.label("event_id"),
                func.sum(Booking.ticket_quantity).label("tickets_sold")
            )
            .filter(Booking.booking_status == "CONFIRMED")
            .group_by(Booking.event_id)
            .subquery()
        )

        query = query.outerjoin(
            popularity_query,
            Event.id == popularity_query.c.event_id
        )

        popularity_value = func.coalesce(
            popularity_query.c.tickets_sold, 0
        )

        if sort_order == "desc":
            query = query.order_by(
                popularity_value.desc(),
                Event.event_date.asc()
            )
        else:
            query = query.order_by(
                popularity_value.asc(),
                Event.event_date.asc()
            )

    elif sort_by == "price":
        ordering = (
            Event.ticket_price.desc()
            if sort_order == "desc"
            else Event.ticket_price.asc()
        )
        query = query.order_by(ordering, Event.event_date.asc())

    else:
        ordering = (
            Event.event_date.desc()
            if sort_order == "desc"
            else Event.event_date.asc()
        )
        query = query.order_by(ordering)

    events = query.offset(skip).limit(limit).all()

    changed = False

    for event in events:
        old_status = event.event_status
        refresh_event_status(event)

        if old_status != event.event_status:
            changed = True

    if changed:
        db.commit()

    return events


# =========================
# ORGANIZER: GET MY EVENTS
# =========================

@router.get(
    "/organizer/my-events",
    response_model=list[EventResponse]
)
def get_my_events(
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    events = (
        db.query(Event)
        .filter(Event.organizer_id == current_user.id)
        .order_by(Event.event_date.asc())
        .all()
    )

    changed = False

    for event in events:
        old_status = event.event_status
        refresh_event_status(event)

        if old_status != event.event_status:
            changed = True

    if changed:
        db.commit()

    return events


# =========================
# GET ONE EVENT
# =========================

@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found."
        )

    old_status = event.event_status
    refresh_event_status(event)

    if old_status != event.event_status:
        db.commit()
        db.refresh(event)

    return event


# =========================
# UPDATE EVENT
# =========================

@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    event_data: EventCreate,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found."
        )

    if event.organizer_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own events."
        )

    if event.event_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="A cancelled event cannot be updated."
        )

    if event.event_status == "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail="A completed event cannot be updated."
        )

    booked_tickets = event.total_tickets - event.available_tickets

    if event_data.total_tickets < booked_tickets:
        raise HTTPException(
            status_code=400,
            detail="Total tickets cannot be less than already booked tickets."
        )

    event.title = event_data.title
    event.description = event_data.description
    event.category = event_data.category
    event.location = event_data.location
    event.event_date = event_data.event_date
    event.ticket_price = event_data.ticket_price
    event.banner_image = event_data.banner_image
    event.total_tickets = event_data.total_tickets
    event.available_tickets = event_data.total_tickets - booked_tickets

    refresh_event_status(event)

    notify_event_bookers(
        db,
        event,
        "Event Updated",
        f"The event '{event.title}' has been updated. Please check the latest event details.",
        "EVENT_UPDATE"
    )

    db.commit()
    db.refresh(event)

    return event


# =========================
# CANCEL EVENT
# =========================

@router.patch("/{event_id}/cancel", response_model=EventResponse)
def cancel_event(
    event_id: int,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found."
        )

    if event.organizer_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only cancel your own events."
        )

    if event.event_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Event is already cancelled."
        )

    if event.event_status == "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail="A completed event cannot be cancelled."
        )

    event.event_status = "CANCELLED"

    notify_event_bookers(
        db,
        event,
        "Event Cancelled",
        f"The event '{event.title}' has been cancelled by the organizer.",
        "EVENT_CANCELLED"
    )

    db.commit()
    db.refresh(event)

    return event


# =========================
# COMPLETE EVENT
# =========================

@router.patch("/{event_id}/complete", response_model=EventResponse)
def complete_event(
    event_id: int,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found."
        )

    if event.organizer_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only complete your own events."
        )

    if event.event_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="A cancelled event cannot be completed."
        )

    if event.event_date > datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="An upcoming event cannot be marked completed."
        )

    event.event_status = "COMPLETED"

    notify_event_bookers(
        db,
        event,
        "Event Completed",
        f"The event '{event.title}' has been marked as completed.",
        "EVENT_UPDATE"
    )

    db.commit()
    db.refresh(event)

    return event

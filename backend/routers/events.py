from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
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
    """Refresh date-based status without overriding cancellation."""
    if event.event_status == "CANCELLED":
        return

    now = datetime.utcnow()

    if event.event_date > now:
        event.event_status = "UPCOMING"
    else:
        # Completion can be explicitly marked by the organizer.
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
            type=notification_type
        )
        db.add(notification)


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


@router.get("", response_model=list[EventResponse])
def get_events(
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    query = db.query(Event)

    if category:
        query = query.filter(Event.category == category)

    if search:
        query = query.filter(Event.title.ilike(f"%{search}%"))

    events = query.order_by(Event.event_date.asc()).all()

    changed = False
    for event in events:
        old_status = event.event_status
        refresh_event_status(event)
        if old_status != event.event_status:
            changed = True

    if changed:
        db.commit()

    return events


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


@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    old_status = event.event_status
    refresh_event_status(event)

    if old_status != event.event_status:
        db.commit()
        db.refresh(event)

    return event


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
            detail="Event not found"
        )

    if event.organizer_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own events"
        )

    if event.event_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="A cancelled event cannot be updated"
        )

    booked_tickets = event.total_tickets - event.available_tickets

    if event_data.total_tickets < booked_tickets:
        raise HTTPException(
            status_code=400,
            detail="Total tickets cannot be less than already booked tickets"
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
            detail="Event not found"
        )

    if event.organizer_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only cancel your own events"
        )

    if event.event_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Event is already cancelled"
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
            detail="Event not found"
        )

    if event.organizer_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only complete your own events"
        )

    if event.event_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="A cancelled event cannot be completed"
        )

    if event.event_date > datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="An upcoming event cannot be marked completed"
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
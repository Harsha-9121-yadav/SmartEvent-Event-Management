
import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, SessionLocal, Base
import models

from routers.auth import router as auth_router
from routers.events import router as events_router
from routers.bookings import router as bookings_router
from routers.tickets import router as tickets_router
from routers.notifications import router as notifications_router
from routers.admin import router as admin_router
from routers.payments import router as payments_router
from routers.coupons import router as coupons_router
from routers.reviews import router as reviews_router


# =========================
# DATABASE INITIALIZATION
# =========================

# Importing models above ensures their tables are registered.
# create_all creates missing tables but does not migrate existing tables.
Base.metadata.create_all(bind=engine)


# =========================
# STATIC DIRECTORIES
# =========================

os.makedirs(
    "static/qrcodes",
    exist_ok=True
)


# =========================
# EVENT REMINDER CHECKER
# =========================

async def event_reminder_checker():

    while True:

        try:

            db = SessionLocal()

            try:

                now = datetime.utcnow()
                reminder_limit = now + timedelta(hours=24)

                upcoming_events = (
                    db.query(models.Event)
                    .filter(
                        models.Event.event_date > now,
                        models.Event.event_date <= reminder_limit,
                        models.Event.event_status != "CANCELLED"
                    )
                    .all()
                )

                for event in upcoming_events:

                    bookings = (
                        db.query(models.Booking)
                        .filter(
                            models.Booking.event_id == event.id,
                            models.Booking.booking_status == "CONFIRMED"
                        )
                        .all()
                    )

                    for booking in bookings:

                        existing_notification = (
                            db.query(models.Notification)
                            .filter(
                                models.Notification.user_id == booking.user_id,
                                models.Notification.type == "EVENT",
                                models.Notification.title == "Upcoming Event Reminder",
                                models.Notification.message.contains(
                                    f"'{event.title}'"
                                )
                            )
                            .first()
                        )

                        if existing_notification:
                            continue

                        notification = models.Notification(
                            user_id=booking.user_id,
                            title="Upcoming Event Reminder",
                            message=(
                                f"Your event '{event.title}' "
                                f"is happening within the next "
                                f"24 hours at {event.location}."
                            ),
                            type="EVENT",
                            is_read=False
                        )

                        db.add(notification)

                db.commit()

            finally:
                db.close()

        except Exception as error:

            print(
                "Event reminder checker error:",
                error
            )

        # Check for reminders every 60 seconds.
        await asyncio.sleep(60)


# =========================
# APPLICATION LIFESPAN
# =========================

@asynccontextmanager
async def lifespan(app: FastAPI):

    reminder_task = asyncio.create_task(
        event_reminder_checker()
    )

    try:
        yield

    finally:
        reminder_task.cancel()

        try:
            await reminder_task

        except asyncio.CancelledError:
            pass


# =========================
# FASTAPI APPLICATION
# =========================

app = FastAPI(
    title="SmartEvent API",
    description="Event Discovery & Ticket Booking System",
    version="1.0.0",
    lifespan=lifespan
)


# =========================
# STATIC FILES
# =========================

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)


# =========================
# CORS CONFIGURATION
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# REGISTER API ROUTERS
# =========================

app.include_router(auth_router)
app.include_router(events_router)
app.include_router(bookings_router)
app.include_router(tickets_router)
app.include_router(notifications_router)
app.include_router(admin_router)
app.include_router(payments_router)
app.include_router(coupons_router)
app.include_router(reviews_router)


# =========================
# ROOT ENDPOINT
# =========================

@app.get("/")
def root():

    return {
        "message": "SmartEvent API is running",
        "docs": "/docs",
        "health": "/health"
    }


# =========================
# HEALTH CHECK
# =========================

@app.get("/health")
def health_check():

    return {
        "status": "healthy"
    }

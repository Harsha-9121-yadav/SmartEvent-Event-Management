# SmartEvent - Event Management System

SmartEvent is a full-stack Event Discovery and Ticket Booking System built using FastAPI and React.

The application allows users to discover events, search and filter events, book tickets, manage bookings, receive notifications, access digital QR tickets, and verify tickets.

---

## Features

### User Authentication

- User registration
- User login
- JWT-based authentication
- Secure password hashing using bcrypt
- Protected routes
- User profile
- Token-based API authentication

### Event Discovery

- View all events
- View individual event details
- Search events by title
- Filter events by category
- Music, Tech, Sports, and Business categories
- Event date and location
- Ticket price
- Ticket availability

### Ticket Booking

- Book event tickets
- Select ticket quantity
- Automatic total price calculation
- Ticket availability validation
- Sold-out protection
- Booking confirmation
- Booking history
- Booking ownership validation
- Booking cancellation
- Restore ticket availability after cancellation

### Digital QR Tickets

- Automatic QR ticket generation
- Unique ticket code
- QR code generation
- Digital ticket display
- Event details
- Booking details
- QR ticket download
- Ticket verification
- Valid and invalid ticket checking

### Notifications

- Booking confirmation notification
- Booking cancellation notification
- Upcoming event reminder
- Notification dropdown
- Unread notification count
- Mark notification as read
- Notifications page
- Automatic notification dropdown closing during navigation

### Frontend

- React with Vite
- React Router
- Axios
- Protected routes
- Reusable React components
- Responsive UI
- Loading states
- Error handling
- Professional user interface

---

## Technology Stack

### Backend

- Python
- FastAPI
- SQLAlchemy
- SQLite
- Pydantic
- JWT
- bcrypt
- Uvicorn
- QRCode

### Frontend

- React
- Vite
- JavaScript
- React Router
- Axios
- CSS

---

## Project Structure

```text
SmartEvent-Event-Management/
│
├── backend/
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── bookings.py
│   │   ├── events.py
│   │   ├── notifications.py
│   │   └── tickets.py
│   │
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   ├── schemas.py
│   └── security.py
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── EventCard.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── NotificationDropdown.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── TicketCard.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Booking.jsx
│   │   │   ├── BookingConfirmation.jsx
│   │   │   ├── BookingHistory.jsx
│   │   │   ├── EventDetails.jsx
│   │   │   ├── Events.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Notifications.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── TicketVerification.jsx
│   │   │   └── Tickets.jsx
│   │   │
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md

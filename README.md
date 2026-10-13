# SmartEvent – Event Management System

SmartEvent is a full-stack event management application built to simplify event discovery, booking, payment processing, and ticket management. It provides separate functionality for users, organizers, and administrators.

## Features

- **User Authentication:** User registration and login with JWT-based authentication.
- **Event Management:** Browse events, view event details, and manage events.
- **Event Booking:** Book events and view booking history.
- **Payment Management:** Process payments and track payment status.
- **Coupon Management:** Apply discount coupons and view discounted prices.
- **Digital Tickets:** Generate and manage event tickets with QR codes.
- **Ticket Verification:** Verify tickets using the ticket verification functionality.
- **Notifications:** View, read, and manage notifications.
- **Reviews and Ratings:** Submit reviews and view event ratings.
- **Organizer Dashboard:** Manage events and view booking information.
- **Admin Dashboard:** Access administrative functionality.

## Technology Stack

### Backend
- Python
- FastAPI
- SQLAlchemy
- SQLite
- Pydantic
- JWT Authentication
- Uvicorn

### Frontend
- React
- Vite
- JavaScript
- HTML
- CSS

### Development Tools
- Visual Studio Code
- Git and GitHub
- Swagger UI for API documentation

## Project Structure

```text
SMART EVENT/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── routers/
│   └── ...
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
├── .gitignore
└── README.md
```

## Prerequisites

Install the following before running the application:

- Python 3.9 or later
- Node.js and npm
- Git

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Harsha-9121-yadav/SmartEvent-Event-Management.git
cd SmartEvent-Event-Management
```

### 2. Set Up the Backend

Open a terminal in the project root directory.

Create a Python virtual environment:

```bash
cd backend
python -m venv venv
```

Activate the environment on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

Configure any required environment variables and database settings according to the project configuration.

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

The backend will normally run at:

`http://127.0.0.1:8000`

### 3. Access API Documentation

Once the backend is running, open:

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

These pages provide interactive API documentation.

### 4. Set Up the Frontend

Open a new terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal to access the application.

## Database

SmartEvent uses SQLite with SQLAlchemy for database operations. The database stores application information such as users, events, bookings, payments, tickets, coupons, notifications, and reviews.

Run any required database migration scripts before starting the application if your existing database needs to be updated.

## Security

- Authentication using JWT tokens.
- Password hashing.
- Protected endpoints and role-based access control.
- Environment variables for sensitive configuration.

Do not commit passwords, secret keys, access tokens, or other confidential information to GitHub.

## Future Enhancements

- Integration with a production payment gateway.
- Email and SMS notifications.
- Cloud deployment.
- Enhanced analytics and reporting.
- Automated testing and continuous integration.

## Author

**Harsha Yadav**

GitHub: https://github.com/Harsha-9121-yadav

## License

This project is developed for learning and demonstration purposes.

import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import { useEffect, useState } from "react";
import axios from "axios";

import "./App.css";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Booking from "./pages/Booking";
import BookingHistory from "./pages/BookingHistory";
import BookingConfirmation from "./pages/BookingConfirmation";
import Tickets from "./pages/Tickets";
import Notifications from "./pages/Notifications";
import TicketVerification from "./pages/TicketVerification";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    const token = localStorage.getItem(
      "access_token"
    );

    if (!token) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await axios.get(
        "http://127.0.0.1:8000/api/v1/notifications/unread-count",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUnreadCount(
        response.data.unread_count
      );
    } catch (error) {
      console.error(
        "Unread notification count error:",
        error
      );

      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="app">

        <Navbar
          unreadCount={unreadCount}
          onUnreadCountChange={
            setUnreadCount
          }
        />

        <Routes>

          {/* Public Routes */}

          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/events"
            element={<Events />}
          />

          <Route
            path="/events/:eventId"
            element={<EventDetails />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          {/* Protected Routes */}

          <Route
            path="/events/:eventId/book"
            element={
              <ProtectedRoute>
                <Booking />
              </ProtectedRoute>
            }
          />

          <Route
            path="/booking-confirmation"
            element={
              <ProtectedRoute>
                <BookingConfirmation />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <BookingHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <Tickets />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ticket-verification"
            element={
              <ProtectedRoute>
                <TicketVerification />
              </ProtectedRoute>
            }
          />

        </Routes>

      </div>
    </BrowserRouter>
  );
}

export default App;
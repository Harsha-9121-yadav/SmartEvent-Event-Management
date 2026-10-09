
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import axios from "axios";

import NotificationDropdown from "./NotificationDropdown";

function Navbar({ unreadCount, onUnreadCountChange }) {
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setUserRole(null);
        return;
      }

      try {
        const response = await axios.get(
          "http://127.0.0.1:8000/api/v1/auth/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setUserRole(response.data.role);
      } catch (error) {
        console.error("User role fetch error:", error);
        setUserRole(null);
      }
    };

    fetchUserRole();

    const handleStorageChange = () => {
      fetchUserRole();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const isLoggedIn = Boolean(localStorage.getItem("access_token"));
  const isOrganizer = userRole === "ORGANIZER";
  const isAdmin = userRole === "ADMIN";

  return (
    <header className="navbar">
      <h1
        style={{
          margin: 0,
          marginRight: "36px",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        SmartEvent
      </h1>

      <nav
        className="navbar-links"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "24px",
          flex: 1,
          flexWrap: "wrap",
        }}
      >
        <NavLink to="/" className="nav-link">
          Home
        </NavLink>

        <NavLink to="/events" className="nav-link">
          Events
        </NavLink>

        {isLoggedIn && (
          <>
            <NavLink to="/bookings" className="nav-link">
              My Bookings
            </NavLink>

            <NavLink to="/tickets" className="nav-link">
              My Tickets
            </NavLink>

            <NavLink
              to="/ticket-verification"
              className="nav-link"
            >
              Verify Ticket
            </NavLink>
          </>
        )}

        {(isOrganizer || isAdmin) && (
          <NavLink
            to="/organizer-dashboard"
            className="nav-link organizer-nav-link"
            style={{ whiteSpace: "nowrap" }}
          >
            Organizer Dashboard
          </NavLink>
        )}

        {isAdmin && (
          <NavLink
            to="/admin-dashboard"
            className="nav-link admin-nav-link"
            style={{ whiteSpace: "nowrap" }}
          >
            Admin Dashboard
          </NavLink>
        )}

        {isLoggedIn && (
          <div
            className="notification-nav"
            style={{
              marginLeft: "4px",
              marginRight: "4px",
              flexShrink: 0,
            }}
          >
            <NotificationDropdown
              unreadCount={unreadCount}
              onUnreadCountChange={onUnreadCountChange}
            />
          </div>
        )}

        <div
          className="auth-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            marginLeft: "8px",
            flexShrink: 0,
          }}
        >
          {!isLoggedIn && (
            <>
              <NavLink
                to="/login"
                className="nav-login"
                style={{ whiteSpace: "nowrap" }}
              >
                Login
              </NavLink>

              <NavLink
                to="/register"
                className="nav-register"
                style={{ whiteSpace: "nowrap" }}
              >
                Register
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;

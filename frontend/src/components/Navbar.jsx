
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";

import NotificationDropdown from "./NotificationDropdown";

function Navbar({ unreadCount, onUnreadCountChange }) {
  const navigate = useNavigate();

  const [userRole, setUserRole] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("access_token"))
  );

  useEffect(() => {
    let active = true;

    const fetchUserRole = async () => {
      const token = localStorage.getItem("access_token");

      setIsLoggedIn(Boolean(token));

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

        if (active) {
          setUserRole(
            String(response.data.role || "").toUpperCase()
          );
        }
      } catch (error) {
        console.error("User role fetch error:", error);

        if (active) {
          setUserRole(null);
        }
      }
    };

    fetchUserRole();

    const handleStorageChange = () => {
      fetchUserRole();
    };

    const handleAuthChange = () => {
      fetchUserRole();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("authChange", handleAuthChange);
    window.addEventListener("focus", handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("authChange", handleAuthChange);
      window.removeEventListener("focus", handleAuthChange);
    };
  }, []);

  const isOrganizer = userRole === "ORGANIZER";
  const isAdmin = userRole === "ADMIN";

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");

    setIsLoggedIn(false);
    setUserRole(null);

    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
  };

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

        {isOrganizer && (
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
          {!isLoggedIn ? (
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
          ) : (
            <button
              type="button"
              className="nav-link"
              onClick={handleLogout}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                font: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              Logout
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;

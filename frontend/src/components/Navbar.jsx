import { NavLink } from "react-router-dom";

import NotificationDropdown from "./NotificationDropdown";

function Navbar({
  unreadCount,
  onUnreadCountChange
}) {
  return (
    <header className="navbar">

      <h1>
        SmartEvent
      </h1>

      <nav>

        <NavLink to="/">
          Home
        </NavLink>

        <NavLink to="/events">
          Events
        </NavLink>

        <NavLink to="/bookings">
          My Bookings
        </NavLink>

        <NavLink to="/tickets">
          My Tickets
        </NavLink>

        <NavLink to="/ticket-verification">
          Verify Ticket
        </NavLink>

        <NotificationDropdown
          unreadCount={unreadCount}
          onUnreadCountChange={
            onUnreadCountChange
          }
        />

        <NavLink to="/login">
          Login
        </NavLink>

        <NavLink to="/register">
          Register
        </NavLink>

      </nav>

    </header>
  );
}

export default Navbar;
import { useEffect, useState } from "react";
import {
  useNavigate,
  useLocation
} from "react-router-dom";
import axios from "axios";

import "./NotificationDropdown.css";

function NotificationDropdown({
  unreadCount,
  onUnreadCountChange
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [open, setOpen] =
    useState(false);

  const fetchNotifications = async () => {
    const token = localStorage.getItem(
      "access_token"
    );

    if (!token) {
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(
        "http://127.0.0.1:8000/api/v1/notifications",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications(
        response.data.slice(0, 5)
      );

    } catch (error) {
      console.error(
        "Notification dropdown error:",
        error
      );

    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    setOpen(
      (previousState) =>
        !previousState
    );
  };

  const markAsRead = async (
    notificationId
  ) => {
    const token = localStorage.getItem(
      "access_token"
    );

    if (!token) {
      return;
    }

    try {
      await axios.patch(
        `http://127.0.0.1:8000/api/v1/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setNotifications(
        (previousNotifications) =>
          previousNotifications.map(
            (notification) =>
              notification.id ===
              notificationId
                ? {
                    ...notification,
                    is_read: true,
                  }
                : notification
          )
      );

      if (onUnreadCountChange) {
        onUnreadCountChange(
          Math.max(
            unreadCount - 1,
            0
          )
        );
      }

    } catch (error) {
      console.error(
        "Mark notification as read error:",
        error
      );
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate("/notifications");
  };

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  /*
    Close notification dropdown
    automatically whenever the
    user navigates to another page.
  */

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="notification-dropdown-wrapper">

      <button
        type="button"
        className="notification-dropdown-button"
        onClick={handleToggle}
      >

        <span className="notification-bell">
          🔔
        </span>

        <span>
          Notifications
        </span>

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}

      </button>

      {open && (
        <div className="notification-dropdown">

          <div className="notification-dropdown-header">

            <h3>
              Notifications
            </h3>

            {unreadCount > 0 && (
              <span>
                {unreadCount} unread
              </span>
            )}

          </div>

          {loading && (
            <div className="notification-dropdown-loading">
              Loading notifications...
            </div>
          )}

          {!loading &&
            notifications.length === 0 && (
              <div className="notification-dropdown-empty">

                <div>
                  🔔
                </div>

                <p>
                  No notifications yet.
                </p>

              </div>
            )}

          {!loading &&
            notifications.length > 0 && (
              <div className="notification-dropdown-list">

                {notifications.map(
                  (notification) => (
                    <div
                      key={notification.id}
                      className={`notification-dropdown-item ${
                        notification.is_read
                          ? "dropdown-notification-read"
                          : "dropdown-notification-unread"
                      }`}
                    >

                      <div className="dropdown-notification-icon">

                        {notification.type ===
                        "BOOKING"
                          ? "🎟️"
                          : notification.type ===
                            "EVENT"
                          ? "📅"
                          : "🔔"}

                      </div>

                      <div className="dropdown-notification-content">

                        <div className="dropdown-notification-title">

                          <strong>
                            {notification.title}
                          </strong>

                          {!notification.is_read && (
                            <span>
                              NEW
                            </span>
                          )}

                        </div>

                        <p>
                          {notification.message}
                        </p>

                        <small>
                          {new Date(
                            notification.created_at
                          ).toLocaleString()}
                        </small>

                        {!notification.is_read && (
                          <button
                            type="button"
                            className="dropdown-mark-read-button"
                            onClick={() =>
                              markAsRead(
                                notification.id
                              )
                            }
                          >
                            Mark as read
                          </button>
                        )}

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          <div className="notification-dropdown-footer">

            <button
              type="button"
              onClick={handleViewAll}
            >
              View All Notifications
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

export default NotificationDropdown;
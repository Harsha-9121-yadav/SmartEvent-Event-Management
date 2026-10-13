
import { useEffect, useState } from "react";
import axios from "axios";
import "../App.css";

const API_URL = "http://127.0.0.1:8000/api/v1/notifications";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const fetchNotifications = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("Please login to view your notifications.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications(response.data);
    } catch (error) {
      console.error("Notifications error:", error);

      setError(
        error.response?.data?.detail ||
          (error.response
            ? "Unable to load notifications."
            : "Unable to connect to the backend server.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Please login again.");
      return;
    }

    try {
      setActionLoading(`read-${notificationId}`);
      setError("");

      await axios.patch(
        `${API_URL}/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Mark as read error:", error);
      setError(
        error.response?.data?.detail ||
          "Unable to mark notification as read."
      );
    } finally {
      setActionLoading("");
    }
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Please login again.");
      return;
    }

    try {
      setActionLoading("read-all");
      setError("");

      await axios.patch(
        `${API_URL}/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (error) {
      console.error("Mark all as read error:", error);
      setError(
        error.response?.data?.detail ||
          "Unable to mark all notifications as read."
      );
    } finally {
      setActionLoading("");
    }
  };

  const deleteNotification = async (notificationId) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Please login again.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this notification?"
    );

    if (!confirmed) return;

    try {
      setActionLoading(`delete-${notificationId}`);
      setError("");

      await axios.delete(`${API_URL}/${notificationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications((previous) =>
        previous.filter(
          (notification) => notification.id !== notificationId
        )
      );
    } catch (error) {
      console.error("Delete notification error:", error);
      setError(
        error.response?.data?.detail ||
          "Unable to delete notification."
      );
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <main className="notifications-page">
        <section className="notifications-header">
          <h2>Notifications</h2>
          <p>Loading your notifications...</p>
        </section>
      </main>
    );
  }

  const hasUnread = notifications.some(
    (notification) => !notification.is_read
  );

  return (
    <main className="notifications-page">
      <section className="notifications-header">
        <h2>Notifications</h2>

        <p>
          Stay updated with your SmartEvent bookings
          and event activities.
        </p>

        {hasUnread && (
          <button
            type="button"
            className="notification-read-button"
            onClick={markAllAsRead}
            disabled={actionLoading !== ""}
          >
            {actionLoading === "read-all"
              ? "Marking all as read..."
              : "Mark All as Read"}
          </button>
        )}
      </section>

      {error && (
        <p className="notifications-error" role="alert">
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <div className="notifications-empty">
          <div className="notifications-empty-icon">🔔</div>
          <h3>No Notifications</h3>
          <p>You don't have any notifications yet.</p>
        </div>
      ) : (
        <section className="notifications-container">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-card ${
                notification.is_read
                  ? "notification-read"
                  : "notification-unread"
              }`}
            >
              <div className="notification-icon">
                {notification.type === "BOOKING"
                  ? "🎟️"
                  : notification.type === "EVENT"
                    ? "📅"
                    : "🔔"}
              </div>

              <div className="notification-content">
                <div className="notification-top">
                  <h3>{notification.title}</h3>

                  {!notification.is_read && (
                    <span className="notification-new">NEW</span>
                  )}
                </div>

                <p>{notification.message}</p>

                <small>
                  {notification.created_at
                    ? new Date(
                        notification.created_at
                      ).toLocaleString()
                    : "Date unavailable"}
                </small>

                <div className="notification-actions">
                  {!notification.is_read && (
                    <button
                      type="button"
                      className="notification-read-button"
                      onClick={() => markAsRead(notification.id)}
                      disabled={actionLoading !== ""}
                    >
                      {actionLoading === `read-${notification.id}`
                        ? "Updating..."
                        : "Mark as Read"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="cancel-booking-button"
                    onClick={() =>
                      deleteNotification(notification.id)
                    }
                    disabled={actionLoading !== ""}
                  >
                    {actionLoading ===
                    `delete-${notification.id}`
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

export default Notifications;

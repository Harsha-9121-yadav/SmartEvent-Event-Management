import { useEffect, useState } from "react";
import axios from "axios";
import "../App.css";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      const response = await axios.get(
        "http://127.0.0.1:8000/api/v1/notifications",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications(response.data);
    } catch (error) {
      console.error("Notifications error:", error);

      if (error.response) {
        setError(
          error.response.data.detail ||
            "Unable to load notifications."
        );
      } else {
        setError(
          "Unable to connect to the backend server."
        );
      }
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
      return;
    }

    try {
      await axios.patch(
        `http://127.0.0.1:8000/api/v1/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );
    } catch (error) {
      console.error(
        "Mark notification as read error:",
        error
      );
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

  return (
    <main className="notifications-page">

      <section className="notifications-header">
        <h2>Notifications</h2>

        <p>
          Stay updated with your SmartEvent bookings
          and event activities.
        </p>
      </section>

      {error && (
        <p className="notifications-error">
          {error}
        </p>
      )}

      {!error && notifications.length === 0 && (
        <div className="notifications-empty">

          <div className="notifications-empty-icon">
            🔔
          </div>

          <h3>No Notifications</h3>

          <p>
            You don't have any notifications yet.
          </p>

        </div>
      )}

      {!error && notifications.length > 0 && (
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

                  <h3>
                    {notification.title}
                  </h3>

                  {!notification.is_read && (
                    <span className="notification-new">
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
                    className="notification-read-button"
                    onClick={() =>
                      markAsRead(notification.id)
                    }
                  >
                    Mark as Read
                  </button>
                )}

              </div>

            </div>
          ))}

        </section>
      )}

    </main>
  );
}

export default Notifications;
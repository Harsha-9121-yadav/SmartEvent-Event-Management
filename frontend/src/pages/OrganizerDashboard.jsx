import { useEffect, useState } from "react";
import axios from "axios";

import "./OrganizerDashboard.css";

function OrganizerDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrganizerInsights = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("Please login as an organizer.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(
        "http://127.0.0.1:8000/api/v1/bookings/organizer/insights",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setDashboardData(response.data);
      setError("");
    } catch (err) {
      console.error("Organizer dashboard error:", err);

      if (err.response?.status === 403) {
        setError("Organizer access required.");
      } else if (err.response?.status === 401) {
        setError("Your session has expired. Please login again.");
      } else {
        setError("Unable to load organizer dashboard.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizerInsights();
  }, []);

  if (loading) {
    return (
      <div className="organizer-dashboard">
        <div className="dashboard-loading">
          Loading organizer dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="organizer-dashboard">
        <div className="dashboard-error">{error}</div>
      </div>
    );
  }

  const events = dashboardData?.events || [];

  const totalBookings = events.reduce(
    (total, event) => total + Number(event.booking_count || 0),
    0
  );

  const maxTickets = Math.max(
    1,
    ...events.map((event) => Number(event.tickets_sold || 0))
  );

  return (
    <div className="organizer-dashboard">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-label">ORGANIZER PANEL</p>
          <h1>Organizer Dashboard</h1>
          <p className="dashboard-subtitle">
            Track your events, bookings, tickets and revenue.
          </p>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="dashboard-stat-card">
          <div className="stat-icon">🎪</div>
          <div>
            <p>Total Events</p>
            <h2>{dashboardData?.total_events || 0}</h2>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-icon">🎟️</div>
          <div>
            <p>Tickets Sold</p>
            <h2>{dashboardData?.total_tickets_sold || 0}</h2>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-icon">💰</div>
          <div>
            <p>Total Revenue</p>
            <h2>
              ₹{Number(dashboardData?.total_revenue || 0).toLocaleString("en-IN")}
            </h2>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-icon">📊</div>
          <div>
            <p>Total Bookings</p>
            <h2>{totalBookings}</h2>
          </div>
        </div>
      </div>

      {/* Ticket sales chart */}
      <div className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Ticket Sales Overview</h2>
            <p>Compare tickets sold across your events.</p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="empty-dashboard">
            <div className="empty-icon">🎪</div>
            <h3>No events found</h3>
            <p>Create your first event to start tracking performance.</p>
          </div>
        ) : (
          <div
            style={{
              background: "#ffffff",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              marginBottom: "30px",
            }}
          >
            {events.map((event) => {
              const ticketsSold = Number(event.tickets_sold || 0);
              const barWidth = (ticketsSold / maxTickets) * 100;

              return (
                <div key={event.event_id} style={{ marginBottom: "22px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      marginBottom: "8px",
                    }}
                  >
                    <strong>{event.event_title}</strong>
                    <span>{ticketsSold} tickets</span>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "14px",
                      background: "#e2e8f0",
                      borderRadius: "20px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #4f46e5, #8b5cf6)",
                        borderRadius: "20px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Event performance */}
      <div className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Event Performance</h2>
            <p>View ticket sales, bookings and revenue for each event.</p>
          </div>
        </div>

        {events.length > 0 && (
          <div className="event-performance-grid">
            {events.map((event) => {
              const totalTickets = Number(event.total_tickets || 0);
              const ticketsSold = Number(event.tickets_sold || 0);

              const salesPercentage =
                totalTickets > 0
                  ? Math.min(100, (ticketsSold / totalTickets) * 100)
                  : 0;

              return (
                <div
                  className="event-performance-card"
                  key={event.event_id}
                >
                  <div className="event-card-top">
                    <div>
                      <h3>{event.event_title}</h3>
                      <span
                        className={`event-status ${String(
                          event.event_status || "UPCOMING"
                        ).toLowerCase()}`}
                      >
                        {event.event_status || "UPCOMING"}
                      </span>
                    </div>
                    <div className="event-id">#{event.event_id}</div>
                  </div>

                  <div className="performance-stats">
                    <div className="performance-item">
                      <span>🎟️ Tickets Sold</span>
                      <strong>{ticketsSold}</strong>
                    </div>

                    <div className="performance-item">
                      <span>🎫 Remaining</span>
                      <strong>{event.remaining_tickets ?? 0}</strong>
                    </div>

                    <div className="performance-item">
                      <span>📋 Bookings</span>
                      <strong>{event.booking_count ?? 0}</strong>
                    </div>

                    <div className="performance-item">
                      <span>💰 Revenue</span>
                      <strong>
                        ₹{Number(event.total_revenue || 0).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>

                  <div className="ticket-progress">
                    <div className="progress-header">
                      <span>Ticket Sales</span>
                      <span>{Math.round(salesPercentage)}%</span>
                    </div>

                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${salesPercentage}%` }}
                      />
                    </div>

                    <div className="progress-footer">
                      <span>{ticketsSold} sold</span>
                      <span>{totalTickets} total</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrganizerDashboard;

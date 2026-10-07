import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";

function EventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/api/v1/events/${eventId}`
        );

        setEvent(response.data);
      } catch (error) {
        console.error("Event details error:", error);

        setError(
          "Unable to load event details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  if (loading) {
    return (
      <main className="event-details-page">
        <p>Loading event details...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="event-details-page">
        <p>{error}</p>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="event-details-page">
        <p>Event not found.</p>
      </main>
    );
  }

  return (
    <main className="event-details-page">

      <div className="event-details-card">

        <div className="event-details-image">
          🎫
        </div>

        <div className="event-details-content">

          <span className="event-category">
            {event.category}
          </span>

          <h2>{event.title}</h2>

          <p className="event-description">
            {event.description}
          </p>

          <div className="event-info">

            <p>
              📍 <strong>Location:</strong>{" "}
              {event.location}
            </p>

            <p>
              📅 <strong>Date:</strong>{" "}
              {new Date(
                event.event_date
              ).toLocaleDateString()}
            </p>

            <p>
              🕐 <strong>Time:</strong>{" "}
              {new Date(
                event.event_date
              ).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>

            <p>
              🎟️ <strong>Available Tickets:</strong>{" "}
              {event.available_tickets}
            </p>

            <p>
              💰 <strong>Ticket Price:</strong>{" "}
              ₹{event.ticket_price}
            </p>

          </div>

          <div className="event-details-actions">

            <button
              onClick={() =>
                navigate("/events")
              }
            >
              Back to Events
            </button>

            <button
              onClick={() =>
                navigate(`/events/${event.id}/book`)
              }
              disabled={event.available_tickets === 0}
            >
              {event.available_tickets === 0
                ? "Sold Out"
                : "Book Ticket"}
            </button>

          </div>

        </div>

      </div>

    </main>
  );
}

export default EventDetails;
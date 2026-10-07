import { useNavigate } from "react-router-dom";

function EventCard({ event }) {
  const navigate = useNavigate();

  return (
    <div
      className="event-card"
    >

      <div className="event-image">
        🎫
      </div>

      <div className="event-content">

        <span className="event-category">
          {event.category}
        </span>

        <h3>
          {event.title}
        </h3>

        <p>
          {event.description}
        </p>

        <div className="event-details">

          <span>
            📍 {event.location}
          </span>

          <span>
            📅{" "}
            {new Date(
              event.event_date
            ).toLocaleDateString()}
          </span>

          <span>
            🎟️{" "}
            {event.available_tickets}{" "}
            tickets available
          </span>

        </div>

        <div className="event-bottom">

          <strong>
            ₹{event.ticket_price}
          </strong>

          <button
            onClick={() =>
              navigate(
                `/events/${event.id}`
              )
            }
          >
            View Details
          </button>

        </div>

      </div>

    </div>
  );
}

export default EventCard;
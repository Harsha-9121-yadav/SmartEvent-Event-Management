import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";

function Booking() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/api/v1/events/${eventId}`
        );

        setEvent(response.data);
      } catch (error) {
        console.error("Event error:", error);

        setError("Unable to load event.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleBooking = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("Please login before booking a ticket.");
      return;
    }

    if (!event) {
      return;
    }

    if (quantity > event.available_tickets) {
      setError("Not enough tickets available.");
      return;
    }

    try {
      setBookingLoading(true);
      setError("");

      const response = await axios.post(
        "http://127.0.0.1:8000/api/v1/bookings",
        {
          event_id: event.id,
          ticket_quantity: quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "Booking successful:",
        response.data
      );

      navigate("/booking-confirmation", {
        state: {
          booking: response.data,
        },
      });
    } catch (error) {
      console.error("Booking error:", error);

      if (error.response) {
        setError(
          error.response.data.detail ||
            "Booking failed."
        );
      } else {
        setError(
          "Unable to connect to the backend server."
        );
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="booking-page">
        <p>Loading booking details...</p>
      </main>
    );
  }

  if (error && !event) {
    return (
      <main className="booking-page">
        <p className="booking-error">
          {error}
        </p>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="booking-page">
        <p>Event not found.</p>
      </main>
    );
  }

  const totalPrice =
    event.ticket_price * quantity;

  return (
    <main className="booking-page">

      <div className="booking-card">

        <div className="booking-header">

          <span className="event-category">
            {event.category}
          </span>

          <h2>{event.title}</h2>

          <p>
            📍 {event.location}
          </p>

        </div>

        <div className="booking-info">

          <p>
            🎟️ Available tickets:{" "}
            <strong>
              {event.available_tickets}
            </strong>
          </p>

          <p>
            💰 Price per ticket:{" "}
            <strong>
              ₹{event.ticket_price}
            </strong>
          </p>

        </div>

        <div className="quantity-section">

          <label>
            Number of tickets
          </label>

          <select
            value={quantity}
            onChange={(event) =>
              setQuantity(
                Number(event.target.value)
              )
            }
          >

            {Array.from(
              {
                length: Math.min(
                  event.available_tickets,
                  10
                ),
              },
              (_, index) => index + 1
            ).map((number) => (
              <option
                key={number}
                value={number}
              >
                {number}
              </option>
            ))}

          </select>

        </div>

        <div className="booking-total">

          <span>
            Total Price
          </span>

          <strong>
            ₹{totalPrice}
          </strong>

        </div>

        {error && (
          <p className="booking-error">
            {error}
          </p>
        )}

        <div className="booking-actions">

          <button
            className="booking-back-button"
            onClick={() =>
              navigate(
                `/events/${event.id}`
              )
            }
          >
            Back
          </button>

          <button
            className="booking-confirm-button"
            onClick={handleBooking}
            disabled={bookingLoading}
          >
            {bookingLoading
              ? "Booking..."
              : "Confirm Booking"}
          </button>

        </div>

      </div>

    </main>
  );
}

export default Booking;
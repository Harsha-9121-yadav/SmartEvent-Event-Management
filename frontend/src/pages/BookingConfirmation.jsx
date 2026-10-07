import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";

function BookingConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();

  const booking = location.state?.booking;

  if (!booking) {
    return (
      <main className="booking-confirmation-page">
        <div className="booking-confirmation-card">

          <div className="confirmation-icon">
            ⚠️
          </div>

          <h2>Booking Details Not Found</h2>

          <p>
            We couldn't find the booking information.
          </p>

          <button
            onClick={() => navigate("/bookings")}
          >
            Go to My Bookings
          </button>

        </div>
      </main>
    );
  }

  return (
    <main className="booking-confirmation-page">

      <div className="booking-confirmation-card">

        <div className="confirmation-icon">
          ✓
        </div>

        <h2>Booking Confirmed!</h2>

        <p className="confirmation-message">
          Your event booking has been successfully confirmed.
        </p>

        <div className="confirmation-details">

          <div className="confirmation-row">
            <span>Booking ID</span>
            <strong>#{booking.id}</strong>
          </div>

          <div className="confirmation-row">
            <span>Event ID</span>
            <strong>{booking.event_id}</strong>
          </div>

          <div className="confirmation-row">
            <span>Tickets</span>
            <strong>{booking.ticket_quantity}</strong>
          </div>

          <div className="confirmation-row">
            <span>Total Amount</span>
            <strong>₹{booking.total_price}</strong>
          </div>

          <div className="confirmation-row">
            <span>Status</span>
            <strong className="confirmation-status">
              {booking.booking_status}
            </strong>
          </div>

        </div>

        <div className="confirmation-actions">

          <button
            className="confirmation-primary-button"
            onClick={() => navigate("/bookings")}
          >
            View My Bookings
          </button>

          <button
            className="confirmation-secondary-button"
            onClick={() => navigate("/events")}
          >
            Explore More Events
          </button>

        </div>

      </div>

    </main>
  );
}

export default BookingConfirmation;
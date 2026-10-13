import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";

function BookingConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();

  const booking = location.state?.booking;
  const payment = location.state?.payment;

  if (!booking) {
    return (
      <main className="booking-confirmation-page">
        <div className="booking-confirmation-card">
          <div className="confirmation-icon">⚠️</div>

          <h2>Booking Details Not Found</h2>

          <p>
            We couldn't find the booking information.
            Please check your booking history.
          </p>

          <button onClick={() => navigate("/bookings")}>
            Go to My Bookings
          </button>
        </div>
      </main>
    );
  }

  const paymentSuccessful =
    payment?.payment_status === "SUCCESS";

  const originalAmount = Number(
    booking.total_price ?? 0
  );

  const discountAmount = Number(
    booking.discount_amount ?? 0
  );

  const amountPaid = Number(
    payment?.amount ??
      booking.final_amount ??
      originalAmount
  );

  const hasDiscount = discountAmount > 0;

  return (
    <main className="booking-confirmation-page">
      <div className="booking-confirmation-card">
        <div className="confirmation-icon">
          {paymentSuccessful ? "✓" : "🎫"}
        </div>

        <h2>
          {paymentSuccessful
            ? "Payment Successful!"
            : "Booking Details"}
        </h2>

        <p className="confirmation-message">
          {paymentSuccessful
            ? "Your simulated payment was successful and your booking has been confirmed."
            : "Your booking details are available below. Payment confirmation was not provided."}
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
            <span>Booking Amount</span>
            <strong>
              ₹{originalAmount.toFixed(2)}
            </strong>
          </div>

          {hasDiscount && (
            <>
              <div className="confirmation-row">
                <span>Coupon Discount</span>
                <strong className="text-success">
                  -₹{discountAmount.toFixed(2)}
                </strong>
              </div>

              <div className="confirmation-row">
                <span>Final Amount</span>
                <strong>
                  ₹{amountPaid.toFixed(2)}
                </strong>
              </div>
            </>
          )}

          <div className="confirmation-row">
            <span>Booking Status</span>
            <strong className="confirmation-status">
              {booking.booking_status || "PENDING"}
            </strong>
          </div>

          {payment && (
            <>
              <div className="confirmation-row">
                <span>Payment ID</span>
                <strong>#{payment.id}</strong>
              </div>

              <div className="confirmation-row">
                <span>Payment Method</span>
                <strong>{payment.payment_method}</strong>
              </div>

              <div className="confirmation-row">
                <span>Payment Status</span>
                <strong className="confirmation-status">
                  {payment.payment_status}
                </strong>
              </div>

              <div className="confirmation-row">
                <span>Transaction Reference</span>
                <strong
                  style={{
                    overflowWrap: "anywhere",
                    textAlign: "right",
                  }}
                >
                  {payment.transaction_id || "Not available"}
                </strong>
              </div>

              <div className="confirmation-row">
                <span>Amount Paid</span>
                <strong>
                  ₹{Number(payment.amount ?? 0).toFixed(2)}
                </strong>
              </div>
            </>
          )}
        </div>

        {paymentSuccessful && (
          <p>
            <small>
              This transaction was simulated for testing. No real
              money was charged.
            </small>
          </p>
        )}

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
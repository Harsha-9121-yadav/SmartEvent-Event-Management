
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";

const API_URL = "http://127.0.0.1:8000/api/v1";

function Booking() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("UPI");

  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  const [error, setError] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponMessage, setCouponMessage] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/events/${eventId}`
        );

        setEvent(response.data);
      } catch (error) {
        console.error("Event error:", error);

        setError(
          error.response?.data?.detail ||
            "Unable to load event."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const totalPrice = event
    ? Number(event.ticket_price) * quantity
    : 0;

  const discountAmount = appliedCoupon
    ? Number(appliedCoupon.discount_amount)
    : 0;

  const finalAmount = Math.max(
    0,
    totalPrice - discountAmount
  );

  const handleApplyCoupon = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setCouponError("Please login before applying a coupon.");
      return;
    }

    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    if (!event) {
      setCouponError("Event details are not available.");
      return;
    }

    try {
      setCouponLoading(true);
      setCouponError("");
      setCouponMessage("");

      let booking = pendingBooking;

      // Create a pending booking only if one does not already exist.
      if (!booking) {
        const bookingResponse = await axios.post(
          `${API_URL}/bookings`,
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

        booking = bookingResponse.data;
        setPendingBooking(booking);
      }

      const response = await axios.post(
        `${API_URL}/bookings/${booking.id}/apply-coupon`,
        {
          coupon_code: couponCode.trim().toUpperCase(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAppliedCoupon(response.data);
      setCouponCode("");

      setCouponMessage(
        `Coupon ${response.data.coupon_code} applied successfully.`
      );
    } catch (error) {
      console.error("Coupon error:", error);

      setCouponError(
        error.response?.data?.detail ||
          "Unable to apply this coupon."
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setCouponError("Please login again.");
      return;
    }

    if (!pendingBooking) {
      setCouponError("Booking details are unavailable. Please refresh and try again.");
      return;
    }

    try {
      setCouponLoading(true);
      setCouponError("");
      setCouponMessage("");

      const response = await axios.delete(
        `${API_URL}/bookings/${pendingBooking.id}/remove-coupon`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update the UI only after the backend confirms removal.
      setAppliedCoupon(null);

      setPendingBooking((previous) => ({
        ...previous,
        coupon_id: null,
        discount_amount: 0,
        final_amount:
          response.data.final_amount ?? previous.total_price,
      }));

      setCouponMessage(
        response.data.message || "Coupon removed successfully."
      );
    } catch (error) {
      console.error("Remove coupon error:", error);

      setCouponError(
        error.response?.data?.detail ||
          "Unable to remove this coupon."
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const handleBooking = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("Please login before booking a ticket.");
      return;
    }

    if (!event) {
      setError("Event details are not available.");
      return;
    }

    if (
      !pendingBooking &&
      quantity > event.available_tickets
    ) {
      setError("Not enough tickets available.");
      return;
    }

    try {
      setBookingLoading(true);
      setError("");

      let booking = pendingBooking;

      // Reuse an existing pending booking when retrying payment.
      if (!booking) {
        const bookingResponse = await axios.post(
          `${API_URL}/bookings`,
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

        booking = bookingResponse.data;
        setPendingBooking(booking);
      }

      const paymentResponse = await axios.post(
        `${API_URL}/payments/`,
        {
          booking_id: booking.id,
          payment_method: paymentMethod,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (paymentResponse.data.payment_status !== "SUCCESS") {
        setError(
          "Payment was not successful. Please try again."
        );
        return;
      }

      const paidAmount = Number(
        paymentResponse.data.amount ??
          booking.final_amount ??
          booking.total_price ??
          totalPrice
      );

      navigate("/booking-confirmation", {
        state: {
          booking: {
            ...booking,
            total_price: Number(
              booking.total_price ?? totalPrice
            ),
            discount_amount: Number(
              booking.discount_amount ??
                appliedCoupon?.discount_amount ??
                0
            ),
            final_amount: paidAmount,
            booking_status: "CONFIRMED",
          },
          payment: paymentResponse.data,
        },
        replace: true,
      });
    } catch (error) {
      console.error("Booking/payment error:", error);

      const detail = error.response?.data?.detail;

      if (detail === "This booking has already been paid.") {
        setError(
          "This booking already has a successful payment. " +
            "Check your booking history before trying again."
        );
      } else {
        setError(
          detail ||
            "Unable to complete the booking or payment. " +
              "If a booking was created, you can retry payment."
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

  if (!event) {
    return (
      <main className="booking-page">
        <p className="booking-error">
          {error || "Event not found."}
        </p>

        <button
          type="button"
          onClick={() => navigate("/events")}
        >
          Explore Events
        </button>
      </main>
    );
  }

  return (
    <main className="booking-page">
      <div className="booking-card">
        <div className="booking-header">
          <span className="event-category">
            {event.category}
          </span>

          <h2>{event.title}</h2>
          <p>📍 {event.location}</p>
        </div>

        <div className="booking-info">
          <p>
            🎟️ Available tickets:{" "}
            <strong>{event.available_tickets}</strong>
          </p>

          <p>
            💰 Price per ticket:{" "}
            <strong>
              ₹{Number(event.ticket_price).toFixed(2)}
            </strong>
          </p>
        </div>

        <div className="quantity-section">
          <label htmlFor="ticket-quantity">
            Number of tickets
          </label>

          <select
            id="ticket-quantity"
            value={quantity}
            disabled={Boolean(pendingBooking) || bookingLoading}
            onChange={(e) => {
              setQuantity(Number(e.target.value));
              setAppliedCoupon(null);
              setCouponMessage("");
              setCouponError("");
            }}
          >
            {Array.from(
              {
                length: Math.min(
                  Math.max(0, event.available_tickets),
                  10
                ),
              },
              (_, index) => index + 1
            ).map((number) => (
              <option key={number} value={number}>
                {number}
              </option>
            ))}
          </select>
        </div>

        {/* COUPON SECTION */}
        <section className="coupon-section">
          <h3>🎟️ Coupons & Discounts</h3>

          <p>Have a coupon code? Apply it before payment.</p>

          {!appliedCoupon ? (
            <div className="coupon-form">
              <input
                type="text"
                value={couponCode}
                placeholder="Enter coupon code"
                aria-label="Coupon code"
                disabled={couponLoading || bookingLoading}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponError("");
                  setCouponMessage("");
                }}
              />

              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponLoading || bookingLoading}
              >
                {couponLoading ? "Applying..." : "Apply Coupon"}
              </button>
            </div>
          ) : (
            <div className="applied-coupon">
              <p>
                ✅ Applied:{" "}
                <strong>{appliedCoupon.coupon_code}</strong>
              </p>

              <p>
                You save ₹
                {Number(
                  appliedCoupon.discount_amount
                ).toFixed(2)}
              </p>

              <button
                type="button"
                className="secondary-button"
                disabled={bookingLoading || couponLoading}
                onClick={handleRemoveCoupon}
              >
                {couponLoading ? "Removing..." : "Remove Coupon"}
              </button>
            </div>
          )}

          {couponMessage && (
            <p className="success-message" role="status">
              {couponMessage}
            </p>
          )}

          {couponError && (
            <p className="error-message" role="alert">
              {couponError}
            </p>
          )}
        </section>

        <div className="quantity-section">
          <label htmlFor="payment-method">
            Payment method
          </label>

          <select
            id="payment-method"
            value={paymentMethod}
            disabled={bookingLoading}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="UPI">UPI</option>
            <option value="CARD">Card (simulated)</option>
            <option value="NETBANKING">
              Net Banking (simulated)
            </option>
            <option value="CASH">Cash (simulated)</option>
          </select>

          <p>
            <small>
              Test mode only. No real money will be charged.
            </small>
          </p>
        </div>

        {/* PRICE SUMMARY */}
        <div className="booking-total">
          <div>
            <span>Subtotal</span>
            <strong>₹{totalPrice.toFixed(2)}</strong>
          </div>

          {appliedCoupon && (
            <div>
              <span>Discount</span>
              <strong className="text-success">
                -₹{discountAmount.toFixed(2)}
              </strong>
            </div>
          )}

          <div className="final-amount">
            <span>Total Payable</span>
            <strong>₹{finalAmount.toFixed(2)}</strong>
          </div>
        </div>

        {pendingBooking && (
          <p>
            Booking #{pendingBooking.id} has been created.
            Complete payment to continue.
          </p>
        )}

        {error && (
          <p className="booking-error" role="alert">
            {error}
          </p>
        )}

        <div className="booking-actions">
          <button
            type="button"
            className="booking-back-button"
            disabled={bookingLoading || couponLoading}
            onClick={() => navigate(`/events/${event.id}`)}
          >
            Back
          </button>

          <button
            type="button"
            className="booking-confirm-button"
            onClick={handleBooking}
            disabled={
              bookingLoading ||
              couponLoading ||
              (!pendingBooking && event.available_tickets < 1)
            }
          >
            {bookingLoading
              ? "Processing..."
              : pendingBooking
                ? "Retry Payment"
                : "Book and Pay"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default Booking;

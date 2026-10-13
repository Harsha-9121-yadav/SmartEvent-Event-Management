
import { useEffect, useState } from "react";
import axios from "axios";
import "../App.css";

const API_URL = "http://127.0.0.1:8000/api/v1";

function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const fetchBookings = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("Please login to view your bookings.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/bookings/my-bookings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setBookings(response.data);
    } catch (error) {
      console.error("Booking history error:", error);

      if (error.response) {
        setError(
          error.response.data.detail ||
            "Unable to load your bookings."
        );
      } else {
        setError("Unable to connect to the backend server.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (bookingId) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("Please login again.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingId(bookingId);
      setError("");

      await axios.patch(
        `${API_URL}/bookings/${bookingId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await fetchBookings();
    } catch (error) {
      console.error("Cancel booking error:", error);

      if (error.response) {
        setError(
          error.response.data.detail ||
            "Unable to cancel booking."
        );
      } else {
        setError("Unable to connect to the backend server.");
      }
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <main className="booking-history-page">
        <h2>My Bookings</h2>
        <p>Loading bookings...</p>
      </main>
    );
  }

  return (
    <main className="booking-history-page">
      <section className="booking-history-header">
        <h2>My Bookings</h2>

        <p>
          View and manage your SmartEvent bookings.
        </p>
      </section>

      {error && (
        <p className="booking-history-error" role="alert">
          {error}
        </p>
      )}

      {bookings.length === 0 ? (
        <div className="booking-history-message">
          <p>You don't have any bookings yet.</p>
        </div>
      ) : (
        <section className="booking-history-container">
          {bookings.map((booking) => {
            const originalAmount = Number(
              booking.total_price ?? 0
            );

            const discountAmount = Number(
              booking.discount_amount ?? 0
            );

            const finalAmount = Number(
              booking.final_amount ?? originalAmount
            );

            const hasDiscount = discountAmount > 0;

            return (
              <div
                className="booking-history-card"
                key={booking.id}
              >
                <h3>🎫 Booking #{booking.id}</h3>

                <p>
                  Event ID: {booking.event_id}
                </p>

                <p>
                  Tickets: {booking.ticket_quantity}
                </p>

                <div className="booking-price-details">
                  <p>
                    Original price: ₹
                    {originalAmount.toFixed(2)}
                  </p>

                  {hasDiscount && (
                    <>
                      <p>
                        Coupon discount:{" "}
                        <strong className="text-success">
                          -₹{discountAmount.toFixed(2)}
                        </strong>
                      </p>

                      <p>
                        Final price:{" "}
                        <strong>
                          ₹{finalAmount.toFixed(2)}
                        </strong>
                      </p>
                    </>
                  )}

                  {!hasDiscount && (
                    <p className="booking-price">
                      Total: ₹{originalAmount.toFixed(2)}
                    </p>
                  )}
                </div>

                <p>
                  Status:{" "}
                  <strong
                    className={
                      booking.booking_status === "CONFIRMED"
                        ? "booking-confirmed"
                        : booking.booking_status === "CANCELLED"
                          ? "booking-cancelled"
                          : ""
                    }
                  >
                    {booking.booking_status}
                  </strong>
                </p>

                <p>
                  Booked on:{" "}
                  {booking.created_at
                    ? new Date(
                        booking.created_at
                      ).toLocaleString()
                    : "Not available"}
                </p>

                {booking.booking_status === "CONFIRMED" && (
                  <button
                    type="button"
                    className="cancel-booking-button"
                    onClick={() => handleCancel(booking.id)}
                    disabled={cancellingId === booking.id}
                  >
                    {cancellingId === booking.id
                      ? "Cancelling..."
                      : "Cancel Booking"}
                  </button>
                )}
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default BookingHistory;
 
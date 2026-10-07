import { useState } from "react";
import axios from "axios";

import "../App.css";
import "./TicketVerification.css";

function TicketVerification() {
  const [ticketCode, setTicketCode] = useState("");
  const [ticket, setTicket] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleVerify = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setTicket(null);

    if (!ticketCode.trim()) {
      setError("Please enter a ticket code.");
      return;
    }

    const token = localStorage.getItem(
      "access_token"
    );

    if (!token) {
      setError(
        "Please login to verify a ticket."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(
        `http://127.0.0.1:8000/api/v1/tickets/verify/${ticketCode.trim()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setTicket(response.data);

      setSuccess(
        "Ticket verified successfully."
      );
    } catch (error) {
      console.error(
        "Ticket verification error:",
        error
      );

      if (error.response) {
        setError(
          error.response.data.detail ||
            "Invalid ticket."
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

  return (
    <main className="ticket-verification-page">

      <section className="ticket-verification-card">

        <div className="ticket-verification-header">

          <div className="verification-icon">
            ✓
          </div>

          <div>

            <span className="verification-label">
              SMART EVENT
            </span>

            <h2>
              Verify Ticket
            </h2>

            <p>
              Verify the authenticity of a
              SmartEvent ticket using its
              unique ticket code.
            </p>

          </div>

        </div>

        <form
          className="verification-form"
          onSubmit={handleVerify}
        >

          <div className="verification-input-group">

            <label htmlFor="ticket-code">
              Ticket Code
            </label>

            <input
              id="ticket-code"
              type="text"
              placeholder="Example: SME-ABC123456789"
              value={ticketCode}
              onChange={(event) =>
                setTicketCode(
                  event.target.value
                )
              }
              autoComplete="off"
            />

          </div>

          <button
            type="submit"
            className="verification-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="verification-spinner">
                  ⟳
                </span>
                Verifying...
              </>
            ) : (
              <>
                ✓ Verify Ticket
              </>
            )}
          </button>

        </form>

        {error && (
          <div className="verification-message verification-error">

            <span>
              ✕
            </span>

            <div>
              <strong>
                Verification Failed
              </strong>

              <p>
                {error}
              </p>
            </div>

          </div>
        )}

        {success && (
          <div className="verification-message verification-success">

            <span>
              ✓
            </span>

            <div>
              <strong>
                Ticket Verified
              </strong>

              <p>
                {success}
              </p>
            </div>

          </div>
        )}

        {ticket && (
          <div className="verified-ticket">

            <div className="verified-ticket-header">

              <div>
                <span>
                  VERIFIED TICKET
                </span>

                <h3>
                  Ticket is Valid
                </h3>
              </div>

              <strong>
                ✓ VALID
              </strong>

            </div>

            <div className="verified-ticket-body">

              <div className="verified-ticket-details">

                <div className="verified-detail">

                  <span>
                    Ticket Code
                  </span>

                  <strong>
                    {ticket.ticket_code}
                  </strong>

                </div>

                <div className="verified-detail">

                  <span>
                    Booking ID
                  </span>

                  <strong>
                    #{ticket.booking_id}
                  </strong>

                </div>

                <div className="verified-detail">

                  <span>
                    Created
                  </span>

                  <strong>
                    {new Date(
                      ticket.created_at
                    ).toLocaleString()}
                  </strong>

                </div>

                <div className="verified-detail">

                  <span>
                    Status
                  </span>

                  <strong className="verified-status">
                    CONFIRMED
                  </strong>

                </div>

              </div>

              {ticket.qr_code_url && (
                <div className="verified-qr-section">

                  <img
                    src={`http://127.0.0.1:8000${ticket.qr_code_url}`}
                    alt="Verified SmartEvent ticket QR code"
                    className="verified-ticket-qr"
                  />

                  <p>
                    Valid SmartEvent QR Ticket
                  </p>

                </div>
              )}

            </div>

          </div>
        )}

        {!ticket && (
          <div className="verification-info">

            <span>
              🔐
            </span>

            <p>
              Enter the unique ticket code
              printed on the SmartEvent
              digital ticket.
            </p>

          </div>
        )}

      </section>

    </main>
  );
}

export default TicketVerification;
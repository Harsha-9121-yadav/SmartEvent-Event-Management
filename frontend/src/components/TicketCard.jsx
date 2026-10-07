function TicketCard({
  ticket,
  booking,
  event,
  onDownload
}) {
  const isCancelled =
    booking?.booking_status ===
    "CANCELLED";

  return (
    <div
      className="ticket-card"
    >

      {/* Ticket Header */}

      <div className="ticket-card-header">

        <div>

          <span className="ticket-label">
            SMART EVENT
          </span>

          <h3>
            {event?.title ||
              "Digital Event Ticket"}
          </h3>

        </div>

        <span
          className="ticket-status"
          style={{
            backgroundColor:
              isCancelled
                ? "#fee2e2"
                : "#dcfce7",
            color:
              isCancelled
                ? "#b91c1c"
                : "#15803d",
          }}
        >
          {booking?.booking_status ||
            "CONFIRMED"}
        </span>

      </div>

      {/* Event Details */}

      {event && (
        <div className="ticket-event-details">

          <div className="ticket-info-row">

            <span>
              Event
            </span>

            <strong>
              {event.title}
            </strong>

          </div>

          <div className="ticket-info-row">

            <span>
              Date
            </span>

            <strong>
              {new Date(
                event.event_date
              ).toLocaleString()}
            </strong>

          </div>

          <div className="ticket-info-row">

            <span>
              Location
            </span>

            <strong>
              {event.location}
            </strong>

          </div>

          <div className="ticket-info-row">

            <span>
              Category
            </span>

            <strong>
              {event.category}
            </strong>

          </div>

        </div>
      )}

      {/* Booking Details */}

      <div className="ticket-card-content">

        <div className="ticket-info">

          <div className="ticket-info-row">

            <span>
              Ticket Code
            </span>

            <strong>
              {ticket.ticket_code}
            </strong>

          </div>

          <div className="ticket-info-row">

            <span>
              Booking ID
            </span>

            <strong>
              #{ticket.booking_id}
            </strong>

          </div>

          {booking && (
            <>
              <div className="ticket-info-row">

                <span>
                  Tickets
                </span>

                <strong>
                  {booking.ticket_quantity}
                </strong>

              </div>

              <div className="ticket-info-row">

                <span>
                  Total Price
                </span>

                <strong>
                  ₹
                  {Number(
                    booking.total_price
                  ).toFixed(2)}
                </strong>

              </div>
            </>
          )}

          <div className="ticket-info-row">

            <span>
              Created
            </span>

            <strong>
              {new Date(
                ticket.created_at
              ).toLocaleString()}
            </strong>

          </div>

        </div>

        {/* QR Code */}

        {ticket.qr_code_url && (
          <div className="ticket-qr-section">

            <img
              src={`http://127.0.0.1:8000${ticket.qr_code_url}`}
              alt="SmartEvent Ticket QR Code"
              className="ticket-qr"
            />

            <p>
              Scan this QR code
              at the event entrance.
            </p>

            <button
              type="button"
              className="ticket-download-button"
              onClick={() =>
                onDownload(ticket)
              }
            >
              Download QR Ticket
            </button>

          </div>
        )}

      </div>

    </div>
  );
}

export default TicketCard;

import "../App.css";

function TicketCard({
  ticket,
  booking,
  event,
  onDownload,
}) {
  return (
    <article className="ticket-card">
      <div className="ticket-card-header">
        <h3>🎫 Digital Ticket</h3>
        <span className="ticket-code">
          {ticket.ticket_code}
        </span>
      </div>

      {event ? (
        <div className="ticket-event-details">
          <h4>{event.title}</h4>

          <p>
            <strong>Category:</strong>{" "}
            {event.category}
          </p>

          <p>
            <strong>Location:</strong>{" "}
            {event.location}
          </p>

          <p>
            <strong>Event Date:</strong>{" "}
            {event.event_date
              ? new Date(
                  event.event_date
                ).toLocaleString()
              : "Not available"}
          </p>
        </div>
      ) : (
        <p>Event details are unavailable.</p>
      )}

      {booking ? (
        <div className="ticket-booking-details">
          <p>
            <strong>Booking ID:</strong>{" "}
            {booking.id}
          </p>

          <p>
            <strong>Tickets:</strong>{" "}
            {booking.ticket_quantity}
          </p>

          <p>
            <strong>Booking Status:</strong>{" "}
            {booking.booking_status}
          </p>

          <p>
            <strong>Amount Paid:</strong> ₹
            {Number(
              booking.final_amount ??
                booking.total_price ??
                0
            ).toFixed(2)}
          </p>
        </div>
      ) : (
        <p>Booking details are unavailable.</p>
      )}

      <p>
        <strong>Ticket Created:</strong>{" "}
        {ticket.created_at
          ? new Date(
              ticket.created_at
            ).toLocaleString()
          : "Not available"}
      </p>

      {ticket.qr_code_url ? (
        <div className="ticket-qr-section">
          <p>Show your QR code at the event entrance.</p>

          <button
            type="button"
            className="ticket-download-button"
            onClick={() => onDownload(ticket)}
          >
            Download QR Code
          </button>
        </div>
      ) : (
        <p>QR code is not available.</p>
      )}
    </article>
  );
}

export default TicketCard;

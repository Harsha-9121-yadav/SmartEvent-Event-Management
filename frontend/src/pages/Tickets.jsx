
import { useEffect, useState } from "react";
import axios from "axios";
import "../App.css";
import TicketCard from "../components/TicketCard";

const API_URL = "http://127.0.0.1:8000/api/v1";
const SERVER_URL = "http://127.0.0.1:8000";

function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTickets = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("Please login to view your tickets.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const ticketResponse = await axios.get(
        `${API_URL}/tickets/my-tickets`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const ticketData = ticketResponse.data;

      const detailedTickets = await Promise.all(
        ticketData.map(async (ticket) => {
          try {
            const bookingResponse = await axios.get(
              `${API_URL}/bookings/${ticket.booking_id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            const booking = bookingResponse.data;

            const eventResponse = await axios.get(
              `${API_URL}/events/${booking.event_id}`
            );

            return {
              ...ticket,
              booking,
              event: eventResponse.data,
            };
          } catch (detailError) {
            console.error("Ticket detail error:", detailError);

            return {
              ...ticket,
              booking: null,
              event: null,
            };
          }
        })
      );

      setTickets(detailedTickets);
    } catch (error) {
      console.error("Tickets error:", error);

      if (error.response) {
        setError(
          error.response.data.detail ||
            "Unable to load your tickets."
        );
      } else {
        setError("Unable to connect to the backend server.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const downloadQRCode = async (ticket) => {
    if (!ticket.qr_code_url) {
      setError("QR code is not available for this ticket.");
      return;
    }

    const qrUrl = ticket.qr_code_url.startsWith("http")
      ? ticket.qr_code_url
      : `${SERVER_URL}${ticket.qr_code_url.startsWith("/") ? "" : "/"}${ticket.qr_code_url}`;

    try {
      const response = await axios.get(qrUrl, {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = `${ticket.ticket_code}.png`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("QR download error:", error);
      window.open(qrUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <main className="tickets-page">
        <section className="tickets-header">
          <h2>My Tickets</h2>
          <p>Loading your digital tickets...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="tickets-page">
      <section className="tickets-header">
        <h2>My Digital Tickets</h2>
        <p>
          Access your SmartEvent tickets, event details, and QR codes.
        </p>
      </section>

      {error && (
        <p className="tickets-error" role="alert">
          {error}
        </p>
      )}

      {!error && tickets.length === 0 && (
        <div className="tickets-empty">
          <div className="tickets-empty-icon">🎫</div>
          <h3>No Tickets Yet</h3>
          <p>Your confirmed event tickets will appear here.</p>
        </div>
      )}

      {!error && tickets.length > 0 && (
        <section className="tickets-container">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              booking={ticket.booking}
              event={ticket.event}
              onDownload={downloadQRCode}
            />
          ))}
        </section>
      )}
    </main>
  );
}

export default Tickets;

import { useNavigate } from "react-router-dom";
import "../App.css";

function Home() {
  const navigate = useNavigate();

  return (
    <main>
      <section className="hero">
        <h2>Discover Amazing Events</h2>

        <p>
          Find events, book tickets, get digital QR tickets,
          and stay updated with SmartEvent.
        </p>

        <button onClick={() => navigate("/events")}>
          Explore Events
        </button>
      </section>

      <section className="features">
        <div>
          <h3>🎫 Easy Booking</h3>

          <p>
            Book your event tickets quickly and securely.
          </p>
        </div>

        <div>
          <h3>📱 QR Tickets</h3>

          <p>
            Get digital tickets with unique QR codes.
          </p>
        </div>

        <div>
          <h3>🔔 Notifications</h3>

          <p>
            Stay updated about your bookings and events.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Home;
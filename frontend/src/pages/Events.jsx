import { useEffect, useState } from "react";
import axios from "axios";
import "../App.css";

import EventCard from "../components/EventCard";

function Events() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        "http://127.0.0.1:8000/api/v1/events",
        {
          params: {
            search: search || undefined,
            category: category || undefined,
          },
        }
      );

      setEvents(response.data);
    } catch (error) {
      console.error(
        "Events error:",
        error
      );

      setError(
        "Unable to load events. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [search, category]);

  return (
    <main className="events-page">

      <section className="events-header">

        <h2>
          Discover Events
        </h2>

        <p>
          Explore upcoming events and find
          something you love.
        </p>

        <div className="events-filters">

          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
          >

            <option value="">
              All Categories
            </option>

            <option value="Music">
              Music
            </option>

            <option value="Tech">
              Tech
            </option>

            <option value="Sports">
              Sports
            </option>

            <option value="Business">
              Business
            </option>

          </select>

        </div>

      </section>

      {loading && (
        <p className="events-message">
          Loading events...
        </p>
      )}

      {error && (
        <p className="events-message error-message">
          {error}
        </p>
      )}

      {!loading &&
        !error &&
        events.length === 0 && (
          <p className="events-message">
            No events found.
          </p>
        )}

      {!loading &&
        !error &&
        events.length > 0 && (

          <section className="events-container">

            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
              />
            ))}

          </section>

        )}

    </main>
  );
}

export default Events;
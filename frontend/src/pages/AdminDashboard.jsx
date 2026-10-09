import { useCallback, useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api/v1";

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    background: "#f5f7fb",
    color: "#1e293b",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "24px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },
  card: {
    background: "#ffffff",
    padding: "22px",
    borderRadius: "14px",
    boxShadow: "0 3px 12px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e8edf5",
  },
  panel: {
    background: "#ffffff",
    padding: "22px",
    borderRadius: "14px",
    border: "1px solid #e8edf5",
    boxShadow: "0 3px 12px rgba(15, 23, 42, 0.04)",
    marginBottom: "22px",
    minWidth: 0,
  },
  button: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 600,
  },
  input: {
    padding: "10px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "#ffffff",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    padding: "12px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #eef2f7",
    fontSize: "14px",
  },
};

function getToken() {
  const keys = [
    "access_token",
    "accessToken",
    "token",
    "authToken",
  ];

  for (const key of keys) {
    const value =
      localStorage.getItem(key) ||
      sessionStorage.getItem(key);

    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "string") return parsed;
        if (parsed?.access_token) return parsed.access_token;
        if (parsed?.token) return parsed.token;
      } catch {
        return value;
      }
    }
  }

  return null;
}

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getNumber(data, keys) {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return 0;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function getLabel(item, candidates, fallback = "Unknown") {
  for (const key of candidates) {
    if (item?.[key] !== undefined && item?.[key] !== null) {
      return String(item[key]);
    }
  }
  return fallback;
}

function BarChart({ items, labelKeys, valueKeys, valueLabel }) {
  const rows = items.map((item, index) => ({
    label: getLabel(item, labelKeys, `Item ${index + 1}`),
    value: getNumber(item, valueKeys),
  }));

  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  if (!rows.length) {
    return <p style={{ color: "#64748b" }}>No chart data available yet.</p>;
  }

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              fontSize: "13px",
              marginBottom: "7px",
            }}
          >
            <span>{row.label}</span>
            <strong>
              {valueLabel === "currency"
                ? formatCurrency(row.value)
                : formatNumber(row.value)}
            </strong>
          </div>
          <div
            style={{
              height: "10px",
              background: "#e9effa",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.max((row.value / maxValue) * 100, 2)}%`,
                background: "#3978ed",
                borderRadius: "10px",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ title, items, columns }) {
  return (
    <section style={styles.panel}>
      <h2 style={{ fontSize: "18px", marginTop: 0 }}>{title}</h2>

      {!items.length ? (
        <p style={{ color: "#64748b" }}>No records available.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th style={styles.th} key={column.label}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id ?? item.event_id ?? index}>
                  {columns.map((column) => (
                    <td style={styles.td} key={column.label}>
                      {column.render
                        ? column.render(item)
                        : getLabel(item, column.keys, "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState({});
  const [dailySales, setDailySales] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [popularEvents, setPopularEvents] = useState([]);
  const [topRevenue, setTopRevenue] = useState([]);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getToken();

    if (!token) {
      setLoading(false);
      setError(
        "No access token found in browser storage. Sign in through your existing SmartEvent frontend first."
      );
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);

    const query = params.toString() ? `?${params.toString()}` : "";

    const requests = [
      ["/admin/overview" + query, setOverview, {}],
      ["/admin/users", setUsers, []],
      ["/admin/events", setEvents, []],
      ["/admin/bookings" + query, setBookings, []],
      ["/admin/analytics/daily-ticket-sales" + query, setDailySales, []],
      ["/admin/analytics/monthly-booking-trends" + query, setMonthlyTrends, []],
      ["/admin/analytics/popular-events", setPopularEvents, []],
      ["/admin/analytics/top-revenue-events", setTopRevenue, []],
    ];

    try {
      const results = await Promise.all(
        requests.map(async ([path, setter, fallback]) => {
          const response = await fetch(`${API_BASE}${path}`, { headers });

          if (!response.ok) {
            const detail = await response.text();
            throw new Error(
              `${response.status} on ${path}: ${detail || response.statusText}`
            );
          }

          const data = await response.json();
          setter(data);
          return data;
        })
      );

      // All eight endpoints completed successfully.
      return results;
    } catch (err) {
      setError(
        err.message ||
          "Unable to load the Admin Dashboard. Check the backend server and login."
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totalUsers = getNumber(overview, [
    "total_users",
    "users_count",
    "user_count",
  ]);
  const totalEvents = getNumber(overview, [
    "total_events",
    "events_count",
    "event_count",
  ]);
  const totalBookings = getNumber(overview, [
    "total_bookings",
    "bookings_count",
    "booking_count",
  ]);
  const totalTickets = getNumber(overview, [
    "total_tickets",
    "tickets_sold",
    "total_tickets_sold",
  ]);
  const totalRevenue = getNumber(overview, [
    "total_revenue",
    "revenue",
    "totalRevenue",
  ]);

  const cards = [
    { label: "Total Users", value: formatNumber(totalUsers), icon: "👥" },
    { label: "Total Events", value: formatNumber(totalEvents), icon: "🎟️" },
    { label: "Total Bookings", value: formatNumber(totalBookings), icon: "📋" },
    { label: "Tickets Sold", value: formatNumber(totalTickets), icon: "🎫" },
    { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: "₹" },
  ];

  if (loading) {
    return (
      <div style={styles.page}>
        <h1>Admin Dashboard</h1>
        <p>Loading dashboard data…</p>
      </div>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: "30px" }}>Admin Dashboard</h1>
          <p style={{ color: "#64748b", marginBottom: 0 }}>
            SmartEvent platform overview and analytics
          </p>
        </div>

        <button style={styles.button} onClick={loadDashboard}>
          Refresh Dashboard
        </button>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            background: "#fff1f2",
            color: "#9f1239",
            border: "1px solid #fecdd3",
            padding: "14px",
            borderRadius: "10px",
            marginBottom: "20px",
            overflowWrap: "anywhere",
          }}
        >
          <strong>Dashboard error:</strong> {error}
          <p style={{ marginBottom: 0 }}>
            Check that the backend is running, your token is current, and your
            account has the ADMIN role.
          </p>
        </div>
      )}

      <section style={styles.grid}>
        {cards.map((card) => (
          <article style={styles.card} key={card.label}>
            <div style={{ fontSize: "25px", marginBottom: "14px" }}>
              {card.icon}
            </div>
            <div style={{ color: "#64748b", fontSize: "14px" }}>
              {card.label}
            </div>
            <div
              style={{
                fontSize: "25px",
                fontWeight: 700,
                marginTop: "8px",
                overflowWrap: "anywhere",
              }}
            >
              {card.value}
            </div>
          </article>
        ))}
      </section>

      <section style={styles.panel}>
        <h2 style={{ marginTop: 0, fontSize: "18px" }}>Filter Analytics</h2>

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "end",
            flexWrap: "wrap",
          }}
        >
          <label style={{ display: "grid", gap: "6px", fontSize: "13px" }}>
            Start date
            <input
              type="date"
              style={styles.input}
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", fontSize: "13px" }}>
            End date
            <input
              type="date"
              style={styles.input}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>

          <button
            style={styles.button}
            onClick={loadDashboard}
            disabled={Boolean(startDate && endDate && startDate > endDate)}
          >
            Apply Filter
          </button>

          <button
            style={{
              ...styles.button,
              background: "#e2e8f0",
              color: "#1e293b",
            }}
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          >
            Clear Dates
          </button>
        </div>

        {startDate && endDate && startDate > endDate && (
          <p style={{ color: "#b91c1c" }}>
            Start date must not be later than end date.
          </p>
        )}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "22px",
        }}
      >
        <div style={styles.panel}>
          <h2 style={{ marginTop: 0, fontSize: "18px" }}>
            Daily Ticket Sales
          </h2>
          <BarChart
            items={getList(dailySales)}
            labelKeys={["date", "day", "sale_date", "label"]}
            valueKeys={[
              "tickets_sold",
              "total_tickets",
              "ticket_count",
              "total",
              "count",
            ]}
          />
        </div>

        <div style={styles.panel}>
          <h2 style={{ marginTop: 0, fontSize: "18px" }}>
            Monthly Booking Trends
          </h2>
          <BarChart
            items={getList(monthlyTrends)}
            labelKeys={["month", "month_name", "period", "label"]}
            valueKeys={["total_bookings", "booking_count", "count", "total"]}
          />
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "22px",
        }}
      >
        <div style={styles.panel}>
          <h2 style={{ marginTop: 0, fontSize: "18px" }}>
            Popular Events
          </h2>
          <BarChart
            items={getList(popularEvents)}
            labelKeys={["event_title", "title", "event_name", "name"]}
            valueKeys={[
              "total_bookings",
              "booking_count",
              "tickets_sold",
              "count",
            ]}
          />
        </div>

        <div style={styles.panel}>
          <h2 style={{ marginTop: 0, fontSize: "18px" }}>
            Top Revenue Events
          </h2>
          <BarChart
            items={getList(topRevenue)}
            labelKeys={["event_title", "title", "event_name", "name"]}
            valueKeys={["total_revenue", "revenue", "total"]}
            valueLabel="currency"
          />
        </div>
      </section>

      <DataTable
        title="All Users"
        items={getList(users)}
        columns={[
          { label: "ID", keys: ["id", "user_id"] },
          { label: "Name", keys: ["name", "full_name", "username"] },
          { label: "Email", keys: ["email"] },
          { label: "Role", keys: ["role"] },
        ]}
      />

      <DataTable
        title="All Events"
        items={getList(events)}
        columns={[
          { label: "ID", keys: ["id", "event_id"] },
          { label: "Event", keys: ["title", "name", "event_title"] },
          { label: "Location", keys: ["location"] },
          { label: "Status", keys: ["event_status", "status"] },
        ]}
      />

      <DataTable
        title="All Bookings"
        items={getList(bookings)}
        columns={[
          { label: "Booking ID", keys: ["id", "booking_id"] },
          { label: "User ID", keys: ["user_id"] },
          { label: "Event ID", keys: ["event_id"] },
          { label: "Tickets", keys: ["ticket_quantity", "quantity"] },
          { label: "Amount", render: (item) => formatCurrency(item.total_price) },
          { label: "Status", keys: ["booking_status", "status"] },
        ]}
      />
    </main>
  );
}

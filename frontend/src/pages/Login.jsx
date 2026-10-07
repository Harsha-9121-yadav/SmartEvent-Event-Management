import { useState } from "react";
import axios from "axios";
import "../App.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/v1/auth/login",
        {
          email,
          password,
        }
      );

      const token = response.data.access_token;

      localStorage.setItem("access_token", token);

      console.log("Login successful:", response.data);

      setMessage("Login successful!");
    } catch (error) {
      console.error("Login error:", error);

      if (error.response) {
        setError(
          error.response.data.detail || "Login failed"
        );
      } else {
        setError(
          "Unable to connect to the backend server."
        );
      }
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">

        <h2>Welcome Back</h2>

        <p className="auth-subtitle">
          Login to your SmartEvent account
        </p>

        <form onSubmit={handleLogin}>

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button type="submit">
            Login
          </button>

        </form>

        {message && (
          <p style={{ color: "green", marginTop: "15px" }}>
            {message}
          </p>
        )}

        {error && (
          <p style={{ color: "red", marginTop: "15px" }}>
            {error}
          </p>
        )}

        <p className="auth-footer">
          Don't have an account? Register here
        </p>

      </div>
    </main>
  );
}

export default Login;
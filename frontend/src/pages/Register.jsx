import { useState } from "react";
import axios from "axios";
import "../App.css";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/v1/auth/register",
        {
          username,
          email,
          password,
        }
      );

      console.log("Registration successful:", response.data);

      setMessage("Registration successful! You can now login.");

      setUsername("");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Registration error:", error);

      if (error.response) {
        setError(
          error.response.data.detail || "Registration failed"
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

        <h2>Create Account</h2>

        <p className="auth-subtitle">
          Register for your SmartEvent account
        </p>

        <form onSubmit={handleRegister}>

          <label>Username</label>

          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />

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
            Register
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
          Already have an account? Login here
        </p>

      </div>
    </main>
  );
}

export default Register;
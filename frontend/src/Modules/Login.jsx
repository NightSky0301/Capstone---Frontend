import { useState } from "react";
import "../Css/Login.css";

export default function Login({ onLogin, onForgotPassword }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Enter both a username and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(
        err.message || "Couldn't sign in. Check your details and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <h1 className="logo">
        <span className="logo-wide">People's</span>
        <span className="logo-normal">Barbershop</span>
      </h1>

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <label className="sr-only" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isSubmitting}
        />

        <label className="sr-only" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
        />

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className="forgot-link"
          onClick={onForgotPassword}
        >
          Forgot Password?
        </button>

        <button type="submit" className="login-button" disabled={isSubmitting}>
          {isSubmitting ? "Logging in…" : "Login"}
        </button>
      </form>
    </div>
  );
}

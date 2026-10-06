import { useState } from "react";
// To use your own logo: put the image in src/Assets, then
//   1) uncomment the import below (fix the filename if needed)
//   2) change LOGO_SRC to: const LOGO_SRC = logo;
// import logo from "../Assets/logo.png";
import "../Css/Login.css";

const LOGO_SRC = null;

export default function Login({ onLogin, onForgotPassword }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="login-card">
        <div className={`login-logo ${LOGO_SRC ? "has-image" : ""}`}>
          {LOGO_SRC ? (
            <img src={LOGO_SRC} alt="People's Barbershop logo" />
          ) : (
            <ScissorsIcon />
          )}
        </div>

        <h1 className="login-brand-name">
          <span className="login-brand-small">People's</span>
          <span className="login-brand-main">Barbershop</span>
        </h1>

        <div className="login-divider" />
        <p className="login-subtitle">Sign in to your account</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="sr-only" htmlFor="username">
            Username
          </label>
          <div className="input-field">
            <span className="input-icon">
              <UserIcon />
            </span>
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
          </div>

          <label className="sr-only" htmlFor="password">
            Password
          </label>
          <div className="input-field">
            <span className="input-icon">
              <LockIcon />
            </span>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={isSubmitting}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <div className="forgot-row">
            <button
              type="button"
              className="forgot-link"
              onClick={onForgotPassword}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in…" : "Login"}
          </button>
        </form>

        <p className="login-footer">Barbershop Management System</p>
      </div>
    </div>
  );
}

function Svg({ children, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ScissorsIcon() {
  return (
    <Svg size={38}>
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <line x1="19" y1="4" x2="8" y2="14" />
      <line x1="8" y1="10" x2="19" y2="20" />
    </Svg>
  );
}

function UserIcon() {
  return (
    <Svg>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </Svg>
  );
}

function EyeIcon() {
  return (
    <Svg>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

function EyeOffIcon() {
  return (
    <Svg>
      <path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.4 0-10-7-10-7a17.6 17.6 0 0 1 4.1-5" />
      <path d="M9.9 5.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-2.2 3.2" />
      <path d="M14.1 14.1a3 3 0 1 1-4.2-4.2" />
      <path d="m2 2 20 20" />
    </Svg>
  );
}

import { useState } from "react";
import { login, register } from "./api.js";
import { LogoMark } from "./icons.jsx";

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isRegistering) await register(email, password);
      onLogin(await login(email, password));
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login">
      <svg className="login-art" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path
          d="M-20 480 C120 420 160 300 300 320 S480 470 560 360 S700 140 840 180"
          fill="none"
          stroke="#ea580c"
          strokeWidth="3"
          strokeDasharray="2 10"
          strokeLinecap="round"
        />
        <path
          d="M-20 120 C140 180 220 60 360 110 S560 260 820 200"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeDasharray="2 10"
          strokeLinecap="round"
        />
      </svg>

      <form className="card" onSubmit={submit}>
        <div className="brand">
          <LogoMark />
          <span>exroute</span>
        </div>
        <h1>{isRegistering ? "Create your account" : "Welcome back"}</h1>
        <p className="lead">Motorcycle routes from plain language.</p>

        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={isRegistering ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? "One moment…" : isRegistering ? "Create account" : "Log in"}
        </button>
        <p className="switch">
          {isRegistering ? "Already have an account? " : "New to exroute? "}
          <button type="button" className="link" onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? "Log in" : "Create an account"}
          </button>
        </p>
      </form>
    </main>
  );
}

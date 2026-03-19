import React, { useState } from "react";

import Header from "../components/Header.tsx";
import Footer from "../components/Footer.tsx";

import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase/firebase";

export default function SignUpPage(props) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [emailInUse, setEmailInUse] = useState(false);
  const [loading, setLoading] = useState(false);

  const getPasswordIssues = (pwd) => {
    const issues = [];
    if (pwd.length < 8) issues.push("Password must be at least 8 characters long.");
    if (!/[A-Z]/.test(pwd)) issues.push("Password must include at least one uppercase letter.");
    if (!/[0-9]/.test(pwd)) issues.push("Password must include at least one number.");
    if (!/[!@#$%^&*]/.test(pwd)) {
      issues.push("Password must include at least one special character (!@#$%^&*).");
    }
    return issues;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setPasswordErrors([]);
    setEmailInUse(false);

    if (!username || !email || !password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const issues = getPasswordIssues(password);
    if (issues.length > 0) {
      setPasswordErrors(issues);
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(userCredential.user, {
        displayName: username,
      });

      if (props.onSignedUp) {
        props.onSignedUp(userCredential.user);
      }

      // ✅ Success alert + redirect
      alert("Account created! Let’s customize your profile.");
      navigate("/profile/customize");

      // optional: clear form (won’t matter much since you navigate away)
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      console.error(err);

      if (err.code === "auth/email-already-in-use") {
        setEmailInUse(true);
        setError("An account with this email already exists.");
      } else {
        setError(err.message || "Failed to sign up. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <Header />
      <section className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-circle">GD</div>
        </div>

        <header className="auth-header">
          <h1>Create your account</h1>
          <p>Join Game DB and start tracking your entire library.</p>
        </header>

        {/* General error */}
        {error && (
          <div className="auth-error">
            {error}

            {/* If email already in use, show Sign In suggestion */}
            {emailInUse && (
              <div style={{ marginTop: "0.5rem" }}>
                <Link
                  to="/signin"
                  style={{ color: "#60a5fa", textDecoration: "underline" }}
                >
                  Sign in instead
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Password error list */}
        {passwordErrors.length > 0 && (
          <div className="auth-error">
            <strong>Password requirements not met:</strong>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.3rem" }}>
              {passwordErrors.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSignUp}>
          {/* USERNAME FIELD */}
          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="username">Username</label>
            </div>
            <input
              id="username"
              type="text"
              className="auth-input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* EMAIL FIELD */}
          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="email">Email Address</label>
            </div>
            <input
              id="email"
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* PASSWORD FIELD */}
          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="password">Password</label>
            </div>
            <input
              id="password"
              type="password"
              className="auth-input"
              placeholder="Enter Your Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* CONFIRM PASSWORD FIELD */}
          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="confirm">Confirm Password</label>
            </div>
            <input
              id="confirm"
              type="password"
              className="auth-input"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/signin">Sign in</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

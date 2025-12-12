import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  // If you ever want "no persistence even on refresh", also:
  // inMemoryPersistence,
} from "firebase/auth";
import { auth } from "../firebase/firebase";

import Header from "../components/Header";
import Footer from "../components/Footer";

import "../styles/signIn.css";
import loadingGif from "../assets/images/loading.gif";

export default function SignInPage(props) {
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [signedIn, setSignedIn]   = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Load rememberMe from localStorage (default = false / unchecked)
  const [rememberMe, setRememberMe] = useState(() => {
    const stored = localStorage.getItem("rememberMe");
    if (stored === null) return false;
    return stored === "true";
  });

  // Check if user is already signed in on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSignedIn(!!user);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      // Set persistence based on "Remember me"
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
        // If you want NO persistence when unchecked, use:
        // rememberMe ? browserLocalPersistence : inMemoryPersistence
      );

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      setSignedIn(true);

      if (props.onSignedIn) {
        props.onSignedIn(userCredential.user);
      }

      setEmail("");
      setPassword("");
    } catch (err) {
      console.error(err);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // While Firebase is figuring out if user is logged in
  if (checkingAuth) {
    return (
      <main className="auth-shell">
        <Header />
        <section className="auth-card">
          <p>Loading...</p>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <Header />

      {signedIn ? (
        // Show this if Firebase says user is already signed in
        <section className="sucessful-signin-block">
          <h2>You’re signed in!</h2>
          <Link to="/profile" className="auth-submit-btn">
            View Profile
          </Link>
        </section>
      ) : (
        // Otherwise show sign-in form
        <section className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-circle">GD</div>
          </div>

          <header className="auth-header">
            <h1>Sign in to Game DB</h1>
            <p>Track your backlog and pick your next game faster.</p>
          </header>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="email">Email</label>
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

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="password">Password</label>
                <Link to="/reset-password">Forgot?</Link>
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

            <div className="auth-remember-row">
              <div className="auth-remember-left">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRememberMe(checked);
                    localStorage.setItem("rememberMe", String(checked));
                  }}
                />
                <label htmlFor="remember">Remember me</label>
              </div>
              <span>Secure sign-in</span>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="auth-footer">
            Don’t have an account?
            <Link to="/signup"> Create one</Link>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}

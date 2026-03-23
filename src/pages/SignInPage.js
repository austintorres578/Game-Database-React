import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  indexedDBLocalPersistence,
  browserSessionPersistence,
  auth
} from "../firebase/fireAuth";

import "../styles/signIn.css";
import loadingGif from "../assets/images/loading.gif";

export default function SignInPage(props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [rememberMe, setRememberMe] = useState(() => {
    const stored = localStorage.getItem("rememberMe");
    return stored === "true";
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("[SIGNIN AUTH STATE]", u ? u.uid : null);
      setUser(u || null);
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      // ✅ Always set persistence right before signing in
      const persistence = rememberMe
        ? indexedDBLocalPersistence
        : browserSessionPersistence;

      await setPersistence(auth, persistence);

      console.log(
        "[AUTH PERSISTENCE SET]",
        rememberMe ? "REMEMBER (IndexedDB)" : "SESSION (until browser closes)",
      );

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      if (props.onSignedIn) {
        props.onSignedIn(userCredential.user);
      }

      setEmail("");
      setPassword("");
    } catch (err) {
      console.error("Login error:", err);

      if (
        err?.code === "auth/unsupported-persistence-type" ||
        (typeof err?.code === "string" && err.code.includes("persistence"))
      ) {
        setError(
          "Your browser is blocking storage needed to stay signed in. Try disabling privacy extensions or allowing site data for this site.",
        );
      } else if (
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/user-not-found" ||
        err?.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password.");
      } else if (err?.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err?.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a bit and try again.");
      } else {
        setError(err?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src={loadingGif}
              alt="Loading"
              style={{ width: 24, height: 24 }}
            />
            <p style={{ margin: 0 }}>Loading...</p>
          </div>
        </section>
        {/* <Footer /> */}
      </main>
    );
  }

  return (
    <main className="auth-shell">

      {user ? (
        <section className="sucessful-signin-block">
          <h2>You’re signed in!</h2>
          <Link to="/profile" className="auth-submit-btn">
            View Profile
          </Link>
        </section>
      ) : (
        <section className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-circle">GD</div>
          </div>

          <header className="auth-header">
            <h1>Sign in to Game DB</h1>
            <p>Track your backlog and pick your next game faster.</p>
          </header>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleLogin} method="post">
            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="email">Email</label>
              </div>
              <input
                id="email"
                name="username"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="password">Password</label>
                <Link to="/reset-password">Forgot?</Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                className="auth-input"
                placeholder="Enter Your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="auth-remember-row">
              <div className="auth-remember-left">
                <input
                  id="remember"
                  name="remember"
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
            Don’t have an account? <Link to="/signup">Create one</Link>
          </div>
        </section>
      )}

    </main>
  );
}

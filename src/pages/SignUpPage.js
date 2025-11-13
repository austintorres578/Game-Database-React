import React, { useState } from "react";

import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase/firebase";


export default function SignUpPage(props) {
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSignUp = async () => {
    setError("");

    // basic checks
    if (!username || !email || !password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      // create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // set displayName to the username
      await updateProfile(userCredential.user, {
        displayName: username,
      });

      // Optional: let parent know signup is done so you can switch UI / redirect
      if (props.onSignedUp) {
        props.onSignedUp(userCredential.user);
      }

      // reset inputs (optional)
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to sign up. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sign-up-page-con">
      <div className="sign-up-page-box">
        <h2>Sign Up</h2>

        <div className="sign-up-inputs">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {error && <p className="sign-up-error">{error}</p>}

          <button
            className="sign-up-submit-button"
            onClick={handleSignUp}
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

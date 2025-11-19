import React, { useState} from "react";
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";

import loadingGif from "../assets/images/loading.gif";

export default function SignInPage(props) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const handleLogin = async (e) => {
    if (e) e.preventDefault(); 
    setError("");

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

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

  return (
    <div className="sign-in-page-con">
      <div className="sign-in-page-box">

        {/* HIDE H2 when loading OR signed in */}
        {!loading && !signedIn && <h2>Sign In</h2>}

        {/* INPUT FORM */}
        {!loading && !signedIn && (
          <form className="sign-in-inputs" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="sign-in-error">{error}</p>}

            <button className="sign-in-submit-button" type="submit">
              Sign In
            </button>

            <p>No account? <Link to="/signup">Sign Up Today!</Link></p>

          </form>
        )}

        {/* LOADING */}
        {loading && !signedIn && (
          <div className="sign-in-loading" style={{ display: "flex" }}>
            <img src={loadingGif} alt="Loading..." />
          </div>
        )}

        {/* SUCCESS */}
        {signedIn && (
          <div className="sign-in-success" style={{ display: "block" }}>
            <h3>Signed in Successfully!</h3>
            <Link to="/">Back To Search</Link>
          </div>
        )}

      </div>
    </div>
  );
}

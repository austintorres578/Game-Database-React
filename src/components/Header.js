import { Link } from "react-router-dom";
import headerLogo from "../assets/images/gameDatabase-nav-logo.png";
import { useEffect, useState } from "react";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Header() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault();
    await signOut(auth);
    setUser(null);
  };

  return (
    <header className="site-header">
      <div className="header-wrapper">

        <Link to="/" className="header-logo">
          <img src={headerLogo} alt="Game Database logo" />
        </Link>

        <nav className="header-nav">
          <Link to="/search">Search For Games</Link>

          {user ? (
            <>
              <Link to="/library">Game Library</Link>
              <Link to="/profile">Profile</Link>

              <a
                href="#"
                onClick={handleLogout}
                className="logout-link"
              >
                Log Out
              </a>
            </>
          ) : (
            <>
              <Link to="/signin">Log In</Link>
              <Link to="/signup" className="header-cta">
                Sign Up
              </Link>
            </>
          )}
        </nav>

      </div>
    </header>
  );
}



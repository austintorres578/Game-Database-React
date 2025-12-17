import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

import headerLogo from "../assets/images/gameDatabase-nav-logo.png";
import mobileNavIcon from "../assets/images/ham-menu-icon.png";
import plusIcon from "../assets/images/plus-icon.png";

export default function Header() {
  const [user, setUser] = useState(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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
    setIsMobileNavOpen(false);
  };

  return (
    <header className="site-header">
      <div className="header-wrapper">
        <Link to="/" className="header-logo">
          <img src={headerLogo} alt="Game Database logo" />
        </Link>

        {/* Desktop Nav */}
        <nav className="header-nav">
          <Link to="/search">Search For Games</Link>

          {user ? (
            <>
              <Link to="/library">Game Library</Link>
              <Link to="/profile">Profile</Link>
              <a href="#" onClick={handleLogout} className="logout-link">
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

          <button
            className="mobile-nav-button"
            onClick={() => setIsMobileNavOpen(true)}
          >
            <img src={mobileNavIcon} alt="Open menu" />
          </button>
        </nav>
      </div>

      {/* Mobile Nav */}
      <div
        className="mobile-nav-wrapper"
        id={isMobileNavOpen ? "revealed-mobile-nav" : undefined}
      >
        <nav>
          <button
            className="close-mobile-nav-button"
            onClick={() => setIsMobileNavOpen(false)}
          >
            <img src={plusIcon} alt="Close menu" />
          </button>

          <Link to="/search" onClick={() => setIsMobileNavOpen(false)}>
            Search For Games
          </Link>

          {user ? (
            <>
              <Link to="/library" onClick={() => setIsMobileNavOpen(false)}>
                Game Library
              </Link>

              <Link to="/profile" onClick={() => setIsMobileNavOpen(false)}>
                Profile
              </Link>

              <a href="#" onClick={handleLogout} className="logout-link">
                Log Out
              </a>
            </>
          ) : (
            <>
              <Link to="/signin" onClick={() => setIsMobileNavOpen(false)}>
                Log In
              </Link>

              <Link to="/signup" onClick={() => setIsMobileNavOpen(false)}>
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

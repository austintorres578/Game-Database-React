import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, onAuthStateChanged, signOut } from "../firebase/fireAuth";

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

  const navClass = ({ isActive }) =>
    isActive ? "nav-link is-active" : "nav-link";

  return (
    <header className="site-header">
      <div className="header-wrapper">
        <NavLink to="/" className="header-logo" end>
          <img src={headerLogo} alt="Game Database logo" />
        </NavLink>

        {/* Desktop Nav */}
        <nav className="header-nav">
          <div>
            <NavLink to="/" className={navClass}>
              Home
            </NavLink>
            <NavLink to="/search" className={navClass}>
              Search For Games
            </NavLink>
          </div>
          {/* <NavLink to="/search" className={navClass}>
            Search For Games
          </NavLink> */}
          <div>
            {user ? (
              <>
                <NavLink to="/library" className={navClass}>
                  Game Library
                </NavLink>
                <NavLink to="/profile" className={navClass}>
                  Profile
                </NavLink>
                <NavLink to="/account-settings" className={navClass}>
                  Account Settings
                </NavLink>
                <a
                  href="#"
                  onClick={handleLogout}
                  className="nav-link logout-link"
                >
                  Log Out
                </a>
              </>
            ) : (
              <>
                <NavLink to="/signin" className={navClass}>
                  Log In
                </NavLink>
                <NavLink
                  to="/signup"
                  className={({ isActive }) =>
                    isActive ? "header-cta is-active" : "header-cta"
                  }
                >
                  Sign Up
                </NavLink>
              </>
            )}
          </div>

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

          <NavLink
            to="/search"
            className={navClass}
            onClick={() => setIsMobileNavOpen(false)}
          >
            Search For Games
          </NavLink>

          {user ? (
            <>
              <NavLink
                to="/library"
                className={navClass}
                onClick={() => setIsMobileNavOpen(false)}
              >
                Game Library
              </NavLink>

              <NavLink
                to="/profile"
                className={navClass}
                onClick={() => setIsMobileNavOpen(false)}
              >
                Profile
              </NavLink>

              <NavLink
                to="/account-settings"
                className={navClass}
                onClick={() => setIsMobileNavOpen(false)}
              >
                Account Settings
              </NavLink>

              <a
                href="#"
                onClick={handleLogout}
                className="nav-link logout-link"
              >
                Log Out
              </a>
            </>
          ) : (
            <>
              <NavLink
                to="/signin"
                className={navClass}
                onClick={() => setIsMobileNavOpen(false)}
              >
                Log In
              </NavLink>

              <NavLink
                to="/signup"
                className={navClass}
                onClick={() => setIsMobileNavOpen(false)}
              >
                Sign Up
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";

import headerLogo from "../assets/images/gameDatabase-nav-logo.png";
import mobileNavIcon from "../assets/images/ham-menu-icon.png";
import plusIcon from "../assets/images/plus-icon.png";

export default function Header() {
  // determines if user is logged in or not
  const [user, setUser] = useState<User | null>(null);

  // Mananges if mobile nav should be visible or not
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  //Listens for any user login/logout changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try{
      await signOut(auth);
      setUser(null);
      setIsMobileNavOpen(false);
    }catch(error){
      console.error("Failed to log out:", error)
    }
  };

  const navClass = ({ isActive }:{isActive:boolean}) => (isActive ? "nav-link is-active" : "nav-link");

  return (
    <header className="site-header">
      <div className="header-wrapper">
        <NavLink to="/" className="header-logo" end>
          <img src={headerLogo} alt="Game Database logo" />
        </NavLink>

        {/* Desktop Nav */}
        <nav className="header-nav">
          <NavLink to="/search" className={navClass}>
            Search For Games
          </NavLink>

          {user ? (
            <>
              <NavLink to="/library" className={navClass}>
                Game Library
              </NavLink>
              <NavLink to="/profile" className={navClass}>
                Profile
              </NavLink>
              <button onClick={handleLogout} type="button" className="nav-link logout-link">
                Log Out
              </button>
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

          <button
            className="mobile-nav-button" type="button" aria-label="open menu"
            onClick={() => setIsMobileNavOpen(true)}
          >
            <img src={mobileNavIcon} alt="" />
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
            type="button" aria-label="close menu" onClick={() => setIsMobileNavOpen(false)}
          >
            <img src={plusIcon} alt="" />
          </button>

          <NavLink to="/search" className={navClass} onClick={() => setIsMobileNavOpen(false)}>
            Search For Games
          </NavLink>

          {user ? (
            <>
              <NavLink to="/library" className={navClass} onClick={() => setIsMobileNavOpen(false)}>
                Game Library
              </NavLink>

              <NavLink to="/profile" className={navClass} onClick={() => setIsMobileNavOpen(false)}>
                Profile
              </NavLink>

              <button type="button" onClick={handleLogout} className="nav-link logout-link">
                Log Out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/signin" className={navClass} onClick={() => setIsMobileNavOpen(false)}>
                Log In
              </NavLink>

              <NavLink to="/signup" className={navClass} onClick={() => setIsMobileNavOpen(false)}>
                Sign Up
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

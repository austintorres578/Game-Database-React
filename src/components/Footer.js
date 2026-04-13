import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged } from "../firebase/fireAuth";

import libraryIcon from "../assets/images/library-icon.png";

import "../styles/footer.css";

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent);

const isInStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

export default function Footer() {
  const [user, setUser] = useState(auth.currentUser);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(
    localStorage.getItem("pwa-banner-dismissed") === "true"
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  // Android — capture the beforeinstallprompt event
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // iOS — show banner if on iOS and not already installed
  useEffect(() => {
    if (isIos() && !isInStandaloneMode()) {
      setShowIosBanner(true);
    }
  }, []);

  const navigate = useNavigate();

  const handleProtectedNav = (e, path) => {
    if (!user) {
      e.preventDefault();
      navigate("/signin");
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setBannerDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", "true");
  };

  // When a footer tag is clicked, jump to /search
  // and tell the Search page which "quick tag" to use.
  const handleTagClick = (label) => {
    navigate("/search", {
      state: {
        quickTag: label, // e.g. "Horror", "RPG"
      },
    });
  };

  return (
    <footer className="footer">
      <nav className="mobile-footer-nav">
        {!bannerDismissed && (installPrompt || showIosBanner) && (
          <div className="mobile-install-banner">
            <p>🎮</p>
            <div className="mobile-install-banner-text">
              <p><strong>Install Save Room</strong></p>
              {showIosBanner ? (
                <p>Tap the Share button in Safari, then <strong>Add to Home Screen</strong></p>
              ) : (
                <p>Add to your home screen for the full app experience</p>
              )}
            </div>
            {installPrompt && (
              <button onClick={handleInstallClick}>Install</button>
            )}
            <span onClick={handleDismiss}>✕</span>
          </div>
        )}
        <div className="mobile-footer-nav-links">
          <NavLink to="/" end>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </NavLink>
          <NavLink to="/search">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </NavLink>
          <NavLink to="/library" onClick={(e) => handleProtectedNav(e, "/library")}>
            <img src={libraryIcon} alt="Library" />
          </NavLink>
          <NavLink to="/profile" onClick={(e) => handleProtectedNav(e, "/profile")}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </NavLink>
          <NavLink to="/account-settings" onClick={(e) => handleProtectedNav(e, "/account-settings")}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
          </NavLink>
        </div>
      </nav>
      <div className="footer-container">
        <h2 className="footer-title">Game Database</h2>

        <div className="footer-grid">
          <div className="footer-column">
            <h3>About</h3>
            <p>
              Your personal video game companion. Browse details, ratings,
              screenshots &amp; more.
            </p>
          </div>

          <div className="footer-column">
            <h3>Links</h3>
            <Link to="/">Home</Link>
            <br />
            <Link to="/search">Search</Link>
            <br />
            {user && (
              <>
                <Link to="/profile">Profile</Link>
                <br />
              </>
            )}
          </div>

          <div className="footer-column">
            <h3>Popular Tags</h3>
            <div className="footer-tags">
              <button
                type="button"
                className="footer-tag"
                onClick={() => handleTagClick("Action")}
              >
                Action
              </button>
              <button
                type="button"
                className="footer-tag"
                onClick={() => handleTagClick("RPG")}
              >
                RPG
              </button>
              <button
                type="button"
                className="footer-tag"
                onClick={() => handleTagClick("Shooter")}
              >
                Shooter
              </button>
              <button
                type="button"
                className="footer-tag"
                onClick={() => handleTagClick("Adventure")}
              >
                Adventure
              </button>
              <button
                type="button"
                className="footer-tag"
                onClick={() => handleTagClick("Indie")}
              >
                Indie
              </button>
              <button
                type="button"
                className="footer-tag"
                onClick={() => handleTagClick("Platformer")}
              >
                Platformer
              </button>
              <button
                type="button"
                className="footer-tag"
                onClick={() => handleTagClick("Strategy")}
              >
                Strategy
              </button>
              <button
                type="button"
                className="footer-tag"
                onClick={() => handleTagClick("Racing")}
              >
                Racing
              </button>
              <button
                type="button"
                className="footer-tag"
                onClick={() => handleTagClick("Co-op")}
              >
                Co-op
              </button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          © {new Date().getFullYear()} GameDB. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

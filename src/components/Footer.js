import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged } from "../firebase/fireAuth";

import libraryIcon from "../assets/images/library-icon.png";
import plusIcon from "../assets/images/plus-icon.svg";

import "../styles/footer.css";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

const isInStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

export default function Footer() {
  const [user, setUser] = useState(auth.currentUser);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(
    localStorage.getItem("pwa-banner-dismissed") === "true",
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
              <p>
                <strong>Install Save Room</strong>
              </p>
              {showIosBanner ? (
                <p>
                  Tap the Share button in Safari, then{" "}
                  <strong>Add to Home Screen</strong>
                </p>
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
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Home</span>
          </NavLink>
          <NavLink to="/search">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <span>Search</span>
          </NavLink>
          <NavLink
            to="/"
            onClick={(e) => handleProtectedNav(e, "/")}
            className={() => ""}
          >
            <div className="add-review-con">
              <p>+</p>
            </div>
          </NavLink>
          <NavLink
            to="/library"
            onClick={(e) => handleProtectedNav(e, "/library")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <span>Library</span>
          </NavLink>
          {/* <NavLink to="/profile" onClick={(e) => handleProtectedNav(e, "/profile")}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </NavLink> */}
          <NavLink
            to="/account-settings"
            onClick={(e) => handleProtectedNav(e, "/account-settings")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Settings</span>
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

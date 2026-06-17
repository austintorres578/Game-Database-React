import { NavLink, useNavigate, Link } from "react-router-dom";
import { gamePath } from "../utils/slugify";
import { useEffect, useRef, useState } from "react";
import { auth, onAuthStateChanged, signOut } from "../firebase/fireAuth";
import { autocompleteRawgGames } from "../services/searchPage/rawgService";
import { doc, getDoc, db } from "../firebase/firestore";
import userDefaultProfileImage from "../assets/images/defaultUser.png";

import headerLogo from "../assets/images/gameDatabase-nav-logo.png";
import mobileNavIcon from "../assets/images/ham-menu-icon.png";
import plusIcon from "../assets/images/plus-icon.png";

function SuggestionThumb({ src, alt }) {
  const [loaded, setLoaded] = useState(false);
  if (!src) return <div className="autocomplete-thumb" />;
  return (
    <div className={`autocomplete-thumb${loaded ? " is-loaded" : " is-loading"}`}>
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </div>
  );
}

function highlightMatch(name, query) {
  const q = (query || "").trim();
  if (!q) return name;
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return name;
  return (
    <>
      {name.slice(0, idx)}
      <mark className="ac-highlight">{name.slice(idx, idx + q.length)}</mark>
      {name.slice(idx + q.length)}
    </>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const userTypingRef = useRef(false);
  const quickSearchRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
        setAvatarUrl(profileSnap.exists() ? profileSnap.data().avatarUrl || null : null);
      } else {
        setAvatarUrl(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (headerSearch.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    if (!userTypingRef.current) return;
    const timer = setTimeout(async () => {
      const results = await autocompleteRawgGames(headerSearch);
      setSuggestions(results);
      setShowSuggestions(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [headerSearch]);

  useEffect(() => {
    if (!showSuggestions) return;
    function handleOutside(e) {
      if (quickSearchRef.current && !quickSearchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showSuggestions]);

  const handleLogout = async (e) => {
    e.preventDefault();
    await signOut(auth);
    setUser(null);
    setIsMobileNavOpen(false);
  };

  const handleHeaderSearch = (e) => {
    e.preventDefault();
    const term = headerSearch.trim();
    if (!term) return;
    setHeaderSearch("");
    navigate("/search", { state: { headerSearch: term } });
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
          <div ref={quickSearchRef} className="quick-search-wrapper">
          <form className="mobile-search-con" onSubmit={handleHeaderSearch}>
            <input
              type="text"
              placeholder="Search"
              value={headerSearch}
              onChange={(e) => {
                userTypingRef.current = true;
                setHeaderSearch(e.target.value);
              }}
            />
            <button type="submit">
              <svg className="search-icon" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="8.5"
                  cy="8.5"
                  r="5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                ></circle>
                <path
                  d="M13 13l3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                ></path>
              </svg>
            </button>
          </form>
          {showSuggestions && suggestions.length > 0 && (
            <div className="quick-search-suggestion-con">
              <div className="quick-search-suggestion">
                {suggestions.map((s) => (
                  <Link
                    key={s.id}
                    to={gamePath(s.id, s.name)}
                    className="autocomplete-item"
                    onClick={() => {
                      userTypingRef.current = false;
                      setHeaderSearch(s.name);
                      setShowSuggestions(false);
                    }}
                  >
                    <SuggestionThumb src={s.background_image} alt={s.name} />
                    <div>
                      <p>{highlightMatch(s.name, headerSearch)}</p>
                      <p>
                        {s.genres.length > 0
                          ? <span>{s.genres[0].name}</span>
                          : <span>Unknown</span>}
                        {s.released && <span> · {new Date(s.released).getFullYear()}</span>}
                      </p>
                    </div>
                    <p className="rating">{s.metacritic ?? "N/A"}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
          </div>
          <div className="desk-nav">
            <NavLink to="/" className={navClass}>
              Home
            </NavLink>
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
                <NavLink to="/account-settings" className={navClass}>
                  Account Settings
                </NavLink>
              </>
            ) : (
              <></>
            )}
          </div>
          {/* <NavLink to="/search" className={navClass}>
            Search For Games
          </NavLink> */}
          <div className="desk-nav">
            {user ? (
              <>
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

          {/* <button
            className="mobile-nav-button"
            onClick={() => setIsMobileNavOpen(true)}
          >
            <img src={mobileNavIcon} alt="Open menu" />
          </button> */}

          <div className="mobile-dyn-buttons">
            {user ? (
              <NavLink className={'profile-con'} to="/profile">
                <img src={avatarUrl || userDefaultProfileImage} alt="Profile" />
              </NavLink>
            ) : (
              <NavLink to="/signin">
                <button>Login</button>
              </NavLink>
            )}
          </div>
        </nav>
      </div>
      {/* Mobile Nav */}
      {/* <div
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
      </div> */}
    </header>
  );
}

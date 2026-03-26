import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged } from "../firebase/fireAuth";

import "../styles/footer.css";

export default function Footer() {
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  const navigate = useNavigate();

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


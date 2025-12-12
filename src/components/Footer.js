import { Link, useNavigate } from "react-router-dom";

import "../styles/footer.css";

export default function Footer() {
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
            <Link to="/profile">Profile</Link>
            <br />
          </div>

          <div className="footer-column">
            <h3>Popular Tags</h3>
            <div className="footer-tags">
              <button
                type="button"
                className="footer-tag"
                onClick={() => handleTagClick("First Person")}
              >
                First Person
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
                onClick={() => handleTagClick("Horror")}
              >
                Horror
              </button>
              <button
                type="button"
                className="footer-tag"
                onClick={() => handleTagClick("Survival")}
              >
                Survival
              </button>
              <button
                type="button"
                className="footer-tag"
                onClick={() => handleTagClick("Co-op")}
              >
                Co-op
              </button>
              <button
                type="button"
                className="footer-tag"
                onClick={() => handleTagClick("Free to Play")}
              >
                Free to Play
              </button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">© 2025 GameDB. All rights reserved.</div>
      </div>
    </footer>
  );
}


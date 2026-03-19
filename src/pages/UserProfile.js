import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { auth, db } from "../firebase/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import "../styles/profile.css";

import userDefaultProfileImage from "../assets/images/defaultUser.png";
import checkIcon from "../assets/images/check-icon.png";

import Header from "../components/Header.tsx";
import Footer from "../components/Footer.tsx";

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);

  // 🔹 Library / tracked games
  const [libraryGames, setLibraryGames] = useState([]);

  // 🔹 Pagination for completed games
  const [completedPage, setCompletedPage] = useState(1);
  const COMPLETED_PER_PAGE = 12;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);

      if (!user) {
        setProfile(null);
        setLibraryGames([]);
        setLoading(false);
        return;
      }

      try {
        // Load profile doc
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          setProfile(null);
        }

        // Load user's library
        const libraryRef = collection(db, "users", user.uid, "library");
        const librarySnap = await getDocs(libraryRef);

        const games = librarySnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setLibraryGames(games);
      } catch (err) {
        console.error("Error loading profile or library:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Derived values
  const displayName =
    profile?.displayName || authUser?.displayName || "NewPlayer";

  const username = profile?.username || authUser?.displayName || "newuser";

  const shortAboutMe =
    profile?.shortAboutMe || "just a new gamer starting my gaming journey";

  const aboutMe =
    profile?.aboutMe ||
    "Hey there! I just joined and I'm excited to start tracking the games I love.";

  const selectedPlatforms = profile?.selectedPlatforms || [];
  const selectedGenres = profile?.selectedGenres || [];
  const profileTags = profile?.profileTags || [];

  const avatarSrc = profile?.avatarPreview || userDefaultProfileImage;

  // 🔹 Stats
  const totalTracked = libraryGames.length;

  const completedGames = libraryGames.filter(
    (g) => g.status === "completed"
  );
  const completedCount = completedGames.length;

  // 🧾 Backlog = everything not completed
  const backlogGames = libraryGames.filter(
    (g) => g.status !== "completed"
  );
  const backlogCount = backlogGames.length;

  // ⭐ Favorites
  const favoriteGames = libraryGames.filter((g) => g.isFavorite);

  const getPrimaryGenre = (game) =>
    Array.isArray(game.genres) && game.genres.length > 0
      ? game.genres[0]
      : "Unknown genre";

  // Pagination
  const totalCompletedPages =
    completedCount > 0
      ? Math.ceil(completedCount / COMPLETED_PER_PAGE)
      : 1;

  const safeCompletedPage = Math.min(completedPage, totalCompletedPages);
  const completedStartIndex =
    (safeCompletedPage - 1) * COMPLETED_PER_PAGE;
  const completedEndIndex =
    completedStartIndex + COMPLETED_PER_PAGE;

  const paginatedCompletedGames = completedGames.slice(
    completedStartIndex,
    completedEndIndex
  );

  useEffect(() => {
    if (completedPage > totalCompletedPages) {
      setCompletedPage(1);
    }
  }, [completedCount, totalCompletedPages, completedPage]);

  if (loading) {
    return (
      <div className="profile-shell">
        <Header />
        <div className="profile profile-loading">
          <p>Loading profile...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="profile-shell">
      <Header />

      <div className="profile">
        <section className="profile-header-card">
          <div className="profile-main">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                <img src={avatarSrc} alt="Profile avatar" />
              </div>
              <div className="profile-status-dot"></div>
            </div>

            <div className="profile-identity">
              <div className="profile-name-row">
                <h1 className="profile-name">{displayName}</h1>
                <span className="profile-username">@{username}</span>
              </div>

              <p className="profile-subline">{shortAboutMe}</p>

              <div className="profile-tags">
                {profileTags.length === 0 ? (
                  <span className="profile-tag profile-tag--empty">
                    Add profile tags in settings
                  </span>
                ) : (
                  profileTags.map((tag) => (
                    <span key={tag} className="profile-tag">
                      {tag}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <p className="platform-title">Platforms</p>

          <div className="game-platforms">
            {selectedPlatforms.length === 0 ? (
              <span className="profile-tag profile-tag--empty">
                Add platforms in settings
              </span>
            ) : (
              selectedPlatforms.map((platform) => (
                <div key={platform}>{platform}</div>
              ))
            )}
          </div>

          <div className="profile-actions">
            <Link to="/profile/customize">
              <button className="btn btn-primary">Edit profile</button>
            </Link>

            <div className="profile-stats-row">
              <div className="profile-stat-pill">
                <strong>{totalTracked}</strong> Games in library
              </div>
              <div className="profile-stat-pill">
                <strong>{completedCount}</strong> Completed
              </div>
            </div>
          </div>
        </section>

        <section className="profile-main-grid">
          {/* ⭐ FAVORITE GAMES */}
          <article className="profile-panel">
            <div className="profile-panel-header">
              <h2>Top Games</h2>
              <span>Click a game to view details.</span>
            </div>

            <div className="favorite-games-row">
              {favoriteGames.length === 0 ? (
                <p className="profile-empty-state">
                  You haven’t favorited any games yet.
                </p>
              ) : (
                favoriteGames.slice(0, 12).map((game) => (
                  <Link
                    key={game.id}
                    to={`/game#${game.id}`}
                    className="favorite-game-card"
                  >
                    <div
                      className="favorite-game-cover"
                      style={{
                        backgroundImage: game.background_image
                          ? `url(${game.background_image})`
                          : "none",
                      }}
                    ></div>
                    <div className="favorite-game-body">
                      <p className="favorite-game-title">
                        {game.name || "Untitled game"}
                      </p>
                      <div className="favorite-game-meta">
                        <span>{getPrimaryGenre(game)}</span>
                        <span className="favorite-game-rating">
                          {game.metacritic ?? "N/A"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </article>

          {/* SIDEBAR */}
          <aside className="profile-sidebar">
            <div className="profile-panel profile-about">
              <div className="profile-panel-header">
                <h2>About</h2>
              </div>
              <p>{aboutMe}</p>

              <span className="small-pill-label">Favorite genres</span>
              <div className="profile-tags-cloud">
                {selectedGenres.length === 0 ? (
                  <span className="profile-tag profile-tag--empty">
                    Add some favorite genres in settings
                  </span>
                ) : (
                  selectedGenres.map((genre) => (
                    <span key={genre}>{genre}</span>
                  ))
                )}
              </div>
            </div>

            <div className="profile-panel">
              <div className="profile-panel-header">
                <h2>Library stats</h2>
              </div>
              <span className="small-pill-label">Overview</span>
              <div className="backlog-stats-grid">
                <div className="backlog-stat-item">
                  <strong>{completedCount}</strong>
                  Completed
                </div>
                <div className="backlog-stat-item">
                  <strong>{backlogCount}</strong>
                  In backlog
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* COMPLETED */}
        <section className="completed-section">
          <h2>Completed</h2>
          <div className="completed-container">
            {completedGames.length === 0 ? (
              <p className="profile-empty-state">
                You haven’t completed any games yet.
              </p>
            ) : (
              paginatedCompletedGames.map((game) => (
                <Link
                  key={game.id}
                  to={`/game#${game.id}`}
                  className="completed-game-card"
                >
                  <div className="select-icon">
                    <img src={checkIcon} alt="Selected" />
                  </div>
                  <div
                    className="completed-game-cover"
                    style={{
                      backgroundImage: game.background_image
                        ? `url(${game.background_image})`
                        : "none",
                    }}
                  ></div>
                  <div className="completed-game-body">
                    <p className="completed-game-title">
                      {game.name || "Untitled game"}
                    </p>
                    <div className="completed-game-meta">
                      <span>{getPrimaryGenre(game)}</span>
                      <span className="completed-game-rating">
                        {game.metacritic ?? "N/A"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {completedGames.length > COMPLETED_PER_PAGE && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={safeCompletedPage === 1}
                onClick={() =>
                  setCompletedPage((p) => Math.max(1, p - 1))
                }
              >
                ‹ Prev
              </button>

              <span className="page-info">
                Page {safeCompletedPage} of {totalCompletedPages}
              </span>

              <button
                className="page-btn"
                disabled={safeCompletedPage === totalCompletedPages}
                onClick={() =>
                  setCompletedPage((p) =>
                    Math.min(totalCompletedPages, p + 1)
                  )
                }
              >
                Next ›
              </button>
            </div>
          )}
        </section>
      </div>

      <Footer />
    </div>
  );
}


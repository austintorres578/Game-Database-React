import React, { useState, useEffect, useRef } from "react";
import parse from "html-react-parser";
import loadingCircle from "../assets/images/loading.gif";

import Footer from "../components/Footer.js";
import Header from "../components/Header";

import defaultBackground from "../assets/images/background.png";
import "../styles/gamePage.css";

import { useNavigate } from "react-router-dom";

// 🔐 Firebase imports
import { auth, db } from "../firebase/firebase";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";

export default function GamePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [gameScreenshots, setGameScreenshots] = useState([]);

  // 🔹 NEW: videos
  const [gameVideos, setGameVideos] = useState([]);

  // fullscreen state
  const [isFullScreenshotOpen, setIsFullScreenshotOpen] = useState(false);
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState(null);

  // library / favorite / completed state
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [savingLibrary, setSavingLibrary] = useState(false);

  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);

  const [isCompleted, setIsCompleted] = useState(false);
  const [savingCompleted, setSavingCompleted] = useState(false);

  // Custom groups for this user
  const [userGroups, setUserGroups] = useState([]);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [savingGroupId, setSavingGroupId] = useState(null);

  // ref for the fullscreen container so we can scroll to it
  const fullscreenRef = useRef(null);

  // 🔹 Ref + state for draggable screenshots row
  const screenshotsRowRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  const addressBarLink = window.location.href;
  const key = "?key=99cd09f6c33b42b5a24a9b447ee04a81";

  function htmlParser(html) {
    return parse(html);
  }

  function requireAuth(actionLabel) {
    const user = auth.currentUser;
    if (!user) {
      alert(`Please sign in to ${actionLabel}.`);
      navigate("/signin");
      return false;
    }
    return true;
  }

  function createGameLink() {
    const rawId = addressBarLink.split("#").pop();

    if (!rawId) {
      console.error("No game ID found in URL hash");
      return;
    }

    const baseUrl = "https://api.rawg.io/api/games/";
    const gameUrl = baseUrl + rawId + key;
    const screenshotsUrl = baseUrl + rawId + "/screenshots" + key;
    const videosUrl = baseUrl + rawId + "/movies" + key; // 🔹 NEW

    searchForData(gameUrl);
    searchForImages(screenshotsUrl);
    searchForVideos(videosUrl); // 🔹 NEW
  }

  function searchForData(link) {
    setLoading(true);

    fetch(link)
      .then((response) => response.json())
      .then((response) => {
        console.log("Game data:", response);
        setGameData(response);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Game data error:", err);
        setLoading(false);
      });
  }

  function searchForImages(link) {
    console.log("Screenshots URL:", link);

    fetch(link)
      .then((response) => response.json())
      .then((response) => {
        console.log("Screenshots response:", response);
        setGameScreenshots(response.results || []);
      })
      .catch((err) => console.error("Screenshots error:", err));
  }

  // 🔹 NEW: fetch and log video info
  function searchForVideos(link) {
    console.log("Videos URL:", link);

    fetch(link)
      .then((response) => response.json())
      .then((response) => {
        console.log("🎥 RAWG video data:", response);
        const results = response.results || [];
        setGameVideos(results);

        if (results.length > 0) {
          console.log("🎥 First video clip info:", results[0]);
        } else {
          console.log("No videos found for this game.");
        }
      })
      .catch((err) => console.error("Videos error:", err));
  }

  useEffect(() => {
    createGameLink();
    // eslint-disable-next-line
  }, []);

  // 🔍 After game data loads, check current state in user's library
  useEffect(() => {
    const checkLibraryState = async () => {
      const user = auth.currentUser;
      if (!user || !gameData?.id) {
        setIsInLibrary(false);
        setIsFavorite(false);
        setIsCompleted(false);
        return;
      }

      try {
        const ref = doc(db, "users", user.uid, "library", String(gameData.id));
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setIsInLibrary(true);
          setIsFavorite(!!data.isFavorite);
          setIsCompleted(data.status === "completed");
        } else {
          setIsInLibrary(false);
          setIsFavorite(false);
          setIsCompleted(false);
        }
      } catch (err) {
        console.error("Error checking library state:", err);
      }
    };

    checkLibraryState();
  }, [gameData]);

  // 🔹 Load user's custom groups
  useEffect(() => {
    const loadGroups = async () => {
      const user = auth.currentUser;
      if (!user) {
        setUserGroups([]);
        return;
      }

      try {
        const groupsRef = collection(db, "users", user.uid, "groups");
        const snap = await getDocs(groupsRef);

        const groups = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "Untitled Group",
            pinned: data.pinned ?? true,
            gameIds: Array.isArray(data.gameIds) ? data.gameIds : [],
          };
        });

        // Sort alphabetically by name
        groups.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );

        setUserGroups(groups);
      } catch (err) {
        console.error("Error loading user groups:", err);
      }
    };

    if (gameData?.id) {
      loadGroups();
    }
  }, [gameData]);

  // Helper: base payload used whenever we create/update a library doc
  function buildBaseGamePayload() {
    if (!gameData) return {};
    return {
      id: gameData.id,
      name: gameData.name,
      slug: gameData.slug || "",
      background_image: gameData.background_image || null,
      released: gameData.released || null,
      metacritic: gameData.metacritic ?? null,
      rating: gameData.rating ?? null,
      platforms:
        gameData.platforms
          ?.map((p) => p.platform?.name)
          .filter(Boolean) || [],
      genres: gameData.genres?.map((g) => g.name).filter(Boolean) || [],
      addedAt: new Date().toISOString(),
    };
  }

  // ✅ Toggle: add to or remove from LIBRARY (doc existence)
  async function handleToggleLibrary(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!gameData) return;
    if (!requireAuth("manage your library")) return;

    const user = auth.currentUser;
    const docRef = doc(db, "users", user.uid, "library", String(gameData.id));

    try {
      setSavingLibrary(true);

      if (isInLibrary) {
        // 🔻 Remove entirely from library (also removes completed/favorite)
        await deleteDoc(docRef);
        setIsInLibrary(false);
        setIsCompleted(false);
        setIsFavorite(false);
      } else {
        // 🔺 Add to library (no specific status yet)
        await setDoc(
          docRef,
          {
            ...buildBaseGamePayload(),
            status: null,
            isFavorite: false,
          },
          { merge: true }
        );
        setIsInLibrary(true);
      }
    } catch (error) {
      console.error("Error updating library:", error);
      alert("There was a problem updating your library. Please try again.");
    } finally {
      setSavingLibrary(false);
    }
  }

  // 🟢 Toggle COMPLETED (inside the library)
  async function handleToggleCompleted(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!gameData) return;
    if (!requireAuth("mark games as completed")) return;

    const user = auth.currentUser;
    const docRef = doc(db, "users", user.uid, "library", String(gameData.id));

    try {
      setSavingCompleted(true);

      if (isCompleted) {
        // 🔻 Unmark completed but keep game in library
        await setDoc(
          docRef,
          {
            ...buildBaseGamePayload(),
            status: null,
          },
          { merge: true }
        );
        setIsCompleted(false);
        setIsInLibrary(true);
      } else {
        // ✅ Mark as completed (auto-add to library if needed)
        await setDoc(
          docRef,
          {
            ...buildBaseGamePayload(),
            status: "completed",
          },
          { merge: true }
        );
        setIsCompleted(true);
        setIsInLibrary(true);
      }
    } catch (error) {
      console.error("Error updating completed status:", error);
      alert(
        "There was a problem updating your completed games. Please try again."
      );
    } finally {
      setSavingCompleted(false);
    }
  }

  // ⭐ Toggle favorite; DOES NOT add to library or touch isInLibrary
  async function handleToggleFavorite(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!gameData) return;
    if (!requireAuth("favorite games")) return;

    const user = auth.currentUser;
    const docRef = doc(db, "users", user.uid, "library", String(gameData.id));

    try {
      setSavingFavorite(true);

      await setDoc(
        docRef,
        {
          ...buildBaseGamePayload(),
          isFavorite: !isFavorite,
        },
        { merge: true }
      );

      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Error updating favorite:", error);
      alert("There was a problem updating favorites. Please try again.");
    } finally {
      setSavingFavorite(false);
    }
  }

  // ➕ Add game to a custom group from dropdown
  async function handleAddToGroup(groupId) {
    if (!gameData) return;
    if (!requireAuth("manage groups")) return;

    const user = auth.currentUser;

    const libraryDocId = String(gameData.id);
    const libraryRef = doc(db, "users", user.uid, "library", libraryDocId);
    const groupRef = doc(db, "users", user.uid, "groups", groupId);

    try {
      setSavingGroupId(groupId);

      // Ensure game exists in library so group linkage makes sense
      await setDoc(
        libraryRef,
        {
          ...buildBaseGamePayload(),
          status: null,
        },
        { merge: true }
      );
      setIsInLibrary(true);

      const snap = await getDoc(groupRef);
      if (!snap.exists()) {
        console.error("Group not found:", groupId);
        return;
      }

      const data = snap.data();
      const currentIdsRaw = Array.isArray(data.gameIds) ? data.gameIds : [];
      const currentIds = currentIdsRaw.map((id) => String(id));

      if (!currentIds.includes(libraryDocId)) {
        const updatedIds = [...currentIds, libraryDocId];

        await setDoc(groupRef, { gameIds: updatedIds }, { merge: true });

        // Update local state
        setUserGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, gameIds: updatedIds } : g))
        );
      }
    } catch (err) {
      console.error("Error adding game to group:", err);
      alert("There was a problem adding this game to the group.");
    } finally {
      setSavingGroupId(null);
      setGroupDropdownOpen(false);
    }
  }

  // open fullscreen with a specific screenshot (by index)
  function openScreenshot(index) {
    setActiveScreenshotIndex(index);
    setIsFullScreenshotOpen(true);
  }

  // close fullscreen
  function closeScreenshot() {
    setIsFullScreenshotOpen(false);
    setActiveScreenshotIndex(null);
  }

  function showPrevScreenshot() {
    if (!gameScreenshots.length || activeScreenshotIndex === null) return;

    setActiveScreenshotIndex((prevIndex) => {
      const newIndex =
        (prevIndex - 1 + gameScreenshots.length) % gameScreenshots.length;
      return newIndex;
    });
  }

  function showNextScreenshot() {
    if (!gameScreenshots.length || activeScreenshotIndex === null) return;

    setActiveScreenshotIndex((prevIndex) => {
      const newIndex = (prevIndex + 1) % gameScreenshots.length;
      return newIndex;
    });
  }

  // When fullscreen opens, scroll to its container
  useEffect(() => {
    if (isFullScreenshotOpen && fullscreenRef.current) {
      fullscreenRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isFullScreenshotOpen]);

  // 🖱️ Mouse drag for screenshots row
  function handleMouseDown(e) {
    if (!screenshotsRowRef.current) return;
    setIsDragging(true);
    dragStartX.current = e.pageX - screenshotsRowRef.current.offsetLeft;
    scrollStartX.current = screenshotsRowRef.current.scrollLeft;
  }

  function handleMouseMove(e) {
    if (!isDragging || !screenshotsRowRef.current) return;
    e.preventDefault(); // prevent text/image selection while dragging
    const x = e.pageX - screenshotsRowRef.current.offsetLeft;
    const walk = x - dragStartX.current; // distance moved
    screenshotsRowRef.current.scrollLeft = scrollStartX.current - walk;
  }

  function stopDragging() {
    setIsDragging(false);
  }

  // 📱 Touch drag
  function handleTouchStart(e) {
    if (!screenshotsRowRef.current) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartX.current = touch.pageX - screenshotsRowRef.current.offsetLeft;
    scrollStartX.current = screenshotsRowRef.current.scrollLeft;
  }

  function handleTouchMove(e) {
    if (!isDragging || !screenshotsRowRef.current) return;
    const touch = e.touches[0];
    const x = touch.pageX - screenshotsRowRef.current.offsetLeft;
    const walk = x - dragStartX.current;
    screenshotsRowRef.current.scrollLeft = scrollStartX.current - walk;
  }

  if (!gameData) {
    return (
      <div className="game-page-shell">
        <Header />
        <div className="game-page-container loading-state">
          <img src={loadingCircle} alt="Loading..." />
        </div>
      </div>
    );
  }

  return (
    <div className="game-page-shell">
      <Header />

      <div className="game-page-container">
        {/* HERO SECTION */}
        <section className="game-hero">
          <div className="game-cover-wrapper">
            <div className="game-cover">
              <div
                className="game-cover-img"
                style={{
                  backgroundImage: `url(${gameData.background_image || defaultBackground})`,
                }}
              ></div>
            </div>
          </div>

          <div className="game-info">
            <div className="game-title-row">
              <h1 className="game-page-title">{gameData.name}</h1>
              <span className="game-year">
                {gameData.released ? `(${gameData.released.slice(0, 4)})` : ""}
              </span>
            </div>

            <div className="game-meta-row">
              <div>
                <span className="meta-label">Metascore</span>
                <span className="metascore-pill">{gameData.metacritic ?? "N/A"}</span>
              </div>
              <div className="meta-divider"></div>
              <div>
                <span className="meta-label">User score</span>
                <span> {gameData.rating ?? "N/A"} / 5</span>
              </div>
            </div>

            <div className="game-genres">
              <span className="meta-label">Genres</span>
              <br />
              <div className="genres">
                {gameData.genres?.length ? (
                  gameData.genres.map((genre) => <p key={genre.id}>{genre.name}</p>)
                ) : (
                  <p>Unlisted</p>
                )}
              </div>
            </div>

            <div className="game-platforms">
              <span className="meta-label">Platforms</span>
              <br />
              <div className="platforms">
                {gameData.platforms?.length ? (
                  gameData.platforms.map((platform) => (
                    <p key={platform.platform.id}>{platform.platform.name}</p>
                  ))
                ) : (
                  <p>Unlisted</p>
                )}
              </div>
            </div>

            <p className="game-short-info">
              {gameData.description_raw || "No description available."}
            </p>

            <div className="game-hero-actions">
              {/* Library toggle */}
              <button
                className={
                  "btn btn-primary in-library" +
                  (isInLibrary ? " successfully-favorited" : "")
                }
                onClick={handleToggleLibrary}
                disabled={savingLibrary || savingFavorite || savingCompleted}
              >
                {savingLibrary
                  ? "Updating..."
                  : isInLibrary
                  ? "Remove from Library"
                  : "Add to Library"}
              </button>

              {/* Completed toggle */}
              <button
                className={
                  "btn btn-ghost completed-button" +
                  (isCompleted ? " completed-button--active" : "")
                }
                onClick={handleToggleCompleted}
                disabled={savingCompleted || savingLibrary || savingFavorite}
              >
                {savingCompleted
                  ? "Updating..."
                  : isCompleted
                  ? "Unmark Completed"
                  : "Mark as Completed"}
              </button>

              {/* Favorite toggle */}
              <button
                className={
                  "btn btn-ghost favorite-button" +
                  (isFavorite ? " favorite-button--active" : "")
                }
                onClick={handleToggleFavorite}
                disabled={savingFavorite || savingLibrary || savingCompleted}
              >
                {savingFavorite
                  ? "Updating..."
                  : isFavorite
                  ? "Unfavorite game"
                  : "Favorite game"}
              </button>

              {/* Group dropdown */}
              {auth.currentUser && userGroups.length > 0 && (
                <div className={"dropdown group-dropdown" + (groupDropdownOpen ? " open" : "")}>
                  <button
                    type="button"
                    className="btn btn-ghost dropdown-trigger"
                    onClick={() => setGroupDropdownOpen((prev) => !prev)}
                  >
                    Add to Group ▾
                  </button>

                  {groupDropdownOpen && (
                    <div className="dropdown-menu">
                      {userGroups.map((group) => {
                        const libraryDocId = String(gameData.id);

                        const inGroup = Array.isArray(group.gameIds)
                          ? group.gameIds.some((id) => String(id) === libraryDocId)
                          : false;

                        return (
                          <button
                            key={group.id}
                            type="button"
                            className={"dropdown-item" + (inGroup ? " in-group" : "")}
                            disabled={inGroup || savingGroupId === group.id}
                            onClick={() => handleAddToGroup(group.id)}
                          >
                            <span className="dropdown-item-label">{group.name}</span>
                            {inGroup && (
                              <span className="dropdown-item-status">
                                ✓ Already in this group
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* MAIN LAYOUT */}
        <section className="game-main-layout">
          <article className="game-panel game-description">
            <h2 className="panel-title">About this game</h2>
            <p>{gameData.description_raw}</p>

            <div className="digital-stores">
              {gameData.stores?.length ? (
                gameData.stores.map((entry, index) => {
                  const store = entry.store;
                  if (!store || !store.domain) return null;

                  return (
                    <a
                      key={store.id || index}
                      href={"https://" + store.domain}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="store-link"
                    >
                      {store.name}
                    </a>
                  );
                })
              ) : (
                <p>No store listed</p>
              )}
            </div>
          </article>

          <aside className="game-sidebar">
            <div className="game-panel">
              <h2 className="panel-title">Game details</h2>
              <p className="panel-sub">Quick facts at a glance.</p>

              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-label">Release date</span>
                  <span className="stat-value">{gameData.released || "Unknown"}</span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">Developer</span>
                  <span className="stat-value">{gameData.developers?.[0]?.name || "Unknown"}</span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">Publisher</span>
                  <span className="stat-value">{gameData.publishers?.[0]?.name || "Unknown"}</span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">Age rating</span>
                  <span className="stat-value">{gameData.esrb_rating?.name || "Unrated"}</span>
                </div>
              </div>
            </div>

            <div className="game-panel">
              <h2 className="panel-title">Tags</h2>
              <div className="game-tags-cloud">
                {gameData.tags?.length ? (
                  gameData.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)
                ) : (
                  <span>No tags</span>
                )}
              </div>
            </div>
          </aside>
        </section>

        {/* SCREENSHOTS */}
        <section className="game-screenshots-section">
          <div className="screenshots-header">
            <h2>Screenshots</h2>
            <span>Scroll horizontally or drag to view more.</span>
          </div>

          <div
            className={`screenshots-row${isDragging ? " is-dragging" : ""}`}
            ref={screenshotsRowRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={stopDragging}
          >
            {gameScreenshots.length > 0 ? (
              gameScreenshots.map((shot, index) => (
                <button
                  type="button"
                  className="screenshot-card"
                  key={shot.id}
                  onClick={() => openScreenshot(index)}
                >
                  <div
                    className="screenshot-img"
                    style={{ backgroundImage: `url(${shot.image})` }}
                  ></div>
                </button>
              ))
            ) : (
              <div className="no-images">
                <h3>No Images</h3>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* FULLSCREEN VIEW */}
      {isFullScreenshotOpen && (
        <div id="full-screenshot" className="full-screenshot" ref={fullscreenRef}>
          <button className="screenshot-close-btn" onClick={closeScreenshot}>
            X
          </button>
          <img
            src={
              activeScreenshotIndex !== null && gameScreenshots[activeScreenshotIndex]
                ? gameScreenshots[activeScreenshotIndex].image
                : defaultBackground
            }
            alt="Full screenshot"
          />
          <div className="screenshot-buttons">
            <button onClick={showPrevScreenshot}>Prev</button>
            <button onClick={showNextScreenshot}>Next</button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

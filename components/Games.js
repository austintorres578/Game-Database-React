import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

import { getPlaceholderBackground } from "../utils/placeholderBackground";
import addIcon from "../assets/images/plus-icon.png";

// 🔐 Firebase
import { auth} from "../firebase/fireAuth";
import { doc, setDoc, getDoc, deleteDoc, db } from "../firebase/firestore";

export default function Games(props) {
  const [isHovered, setIsHovered] = useState(false);

  // Library state for THIS game
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

  const addButtonRef = useRef(null);

  const img = props.background || getPlaceholderBackground(props.name ?? props.id);

  const primaryGenre =
    props.genre && props.genre.length > 0 && props.genre[0]?.name
      ? props.genre[0].name
      : "Genre Unlisted";

  const releaseYear = props.released ? props.released.slice(0, 4) : null;

  const hasRating =
    typeof props.rating === "number" && !Number.isNaN(props.rating);

  const metaText = hasRating ? `${props.rating}` : "N/A";

  // ✅ OLD doc-id convention (pre rawg_):
  // Firestore doc id === RAWG id as a string, e.g. "3498"
  function getLibraryDocId(rawgId) {
    if (rawgId === null || rawgId === undefined) return null;
    return String(rawgId);
  }

  // Helper to normalize platforms into string array
  function extractPlatformNames(consoleList) {
    // RAWG search results typically look like:
    // consoleList = [{ platform: { id, name, ... } }, ...]
    if (!Array.isArray(consoleList)) return [];
    return consoleList.map((p) => p?.platform?.name || p?.name).filter(Boolean);
  }

  // 🔍 On mount / when id changes, check if this game is already in library
  useEffect(() => {
    const checkInLibrary = async () => {
      const user = auth.currentUser;

      if (!user || !props.id) {
        setIsInLibrary(false);
        return;
      }

      try {
        const docId = getLibraryDocId(props.id);
        if (!docId) {
          setIsInLibrary(false);
          return;
        }

        const ref = doc(db, "users", user.uid, "library", docId);
        const snap = await getDoc(ref);
        setIsInLibrary(snap.exists());
      } catch (err) {
        console.error("Error checking library status for card:", err);
      }
    };

    checkInLibrary();
  }, [props.id]);

  const handleAddToLibrary = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const user = auth.currentUser;
    if (!user) {
      alert("You need to be signed in to add games to your library.");
      return;
    }

    if (!props.id) return;

    const docId = getLibraryDocId(props.id);
    if (!docId) return;

    const docRef = doc(db, "users", user.uid, "library", docId);

    try {
      setSaving(true);

      await setDoc(
        docRef,
        {
          // ✅ Keep useful fields, but docId is the source of truth now
          rawgId: props.id,
          id: props.id,

          title: props.name || "",
          name: props.name || "",

          slug: props.slug || null,

          background_image: img || null,
          backgroundImage: img || null,

          metacritic: hasRating ? props.rating : null,
          rating: hasRating ? props.rating : null,

          platforms: extractPlatformNames(props.consoleList),

          genres: primaryGenre !== "Genre Unlisted" ? [primaryGenre] : [],

          status: "backlog",
          isFavorite: false,
          addedAt: new Date().toISOString(),

          _source: "search_quick_add",
        },
        { merge: true }
      );

      setIsInLibrary(true);
    } catch (err) {
      console.error("Error adding game from card:", err);
      alert("There was a problem adding this game. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromLibrary = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const user = auth.currentUser;
    if (!user) {
      alert("You need to be signed in to manage your library.");
      return;
    }

    if (!props.id) return;

    const docId = getLibraryDocId(props.id);
    if (!docId) return;

    const docRef = doc(db, "users", user.uid, "library", docId);

    try {
      setSaving(true);
      await deleteDoc(docRef);
      setIsInLibrary(false);
    } catch (err) {
      console.error("Error removing game from card:", err);
      alert("There was a problem removing this game. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="game-wrapper"
      style={{ animationDelay: `${props.index * 0.05}s` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ✅ Keep RAWG id in the hash (game page fetches by RAWG id) */}
      <Link to={"/game#" + props.id} className="game-link">
        <div className="game-card">
          <div className="metacritic-rating">{metaText}</div>
          <div
            className="game-img"
            style={{ backgroundImage: `url('${img}')` }}
          />
          <div className="game-info">
            <p className="game-title">{props.name}</p>

            <div className="game-sub-info">
              <p className="game-genre">{primaryGenre} •</p>
              {releaseYear && <p>{releaseYear}</p>}
              <span className="metacritic-rating-inline">{metaText}</span>
            </div>
          </div>
        </div>
      </Link>

      <div className="add-button-con">
        {/* ADD button – only show if it's NOT in library */}
        {!isInLibrary && (
          <button
            ref={addButtonRef}
            className={`add-button ${isHovered ? "active" : ""}`}
            onClick={handleAddToLibrary}
            disabled={saving}
            type="button"
          >
            <img src={addIcon} alt="Add to library" />
          </button>
        )}

        {/* REMOVE button – only show if it IS in library */}
        {isInLibrary && (
          <button
            className={`remove-button ${isHovered ? "active" : ""}`}
            onClick={handleRemoveFromLibrary}
            disabled={saving}
            type="button"
          >
            <img src={addIcon} alt="Remove from library" />
          </button>
        )}
      </div>
    </div>
  );
}

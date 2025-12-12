import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

import metacriticIcon from "../assets/images/metacriticIcon.png";
import noGameBackground from "../assets/images/noGameBackground.jpg";
import addIcon from "../assets/images/plus-icon.png";

// 🔐 Firebase
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

export default function Games(props) {
  const [isHovered, setIsHovered] = useState(false);

  // Library state for THIS game
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

  const addButtonRef = useRef(null);

  const img = props.background || noGameBackground;

  const primaryGenre =
    props.genre && props.genre.length > 0 && props.genre[0]?.name
      ? props.genre[0].name
      : "No Genre";

  const hasRating =
    typeof props.rating === "number" && !Number.isNaN(props.rating);

  const metaText = hasRating ? `${props.rating} Metacritic` : "No Score";

  // 🔍 On mount / when id changes, check if this game is already in library
  useEffect(() => {
    const checkInLibrary = async () => {
      const user = auth.currentUser;
      if (!user || !props.id) {
        setIsInLibrary(false);
        return;
      }

      try {
        const ref = doc(db, "users", user.uid, "library", String(props.id));
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

    const docRef = doc(db, "users", user.uid, "library", String(props.id));

    try {
      setSaving(true);

      await setDoc(
        docRef,
        {
          id: props.id,
          name: props.name || "",
          background_image: img || null,
          metacritic: hasRating ? props.rating : null,
          rating: hasRating ? props.rating : null,
          platforms: [], // you can pass real platforms via props later
          genres: primaryGenre !== "No Genre" ? [primaryGenre] : [],
          status: "backlog",
          addedAt: new Date().toISOString(),
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

    const docRef = doc(db, "users", user.uid, "library", String(props.id));

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
      onMouseEnter={() => {
        console.log("Add Button Element (enter):", addButtonRef.current);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        console.log("Add Button Element (leave):", addButtonRef.current);
        setIsHovered(false);
      }}
    >
      <Link to={"/game#" + props.id} className="game-link">
        <div className="game-card">
          <div
            className="game-img"
            style={{ backgroundImage: `url('${img}')` }}
          />
          <div className="game-info">
            <p className="game-title">{props.name}</p>

            <div className="game-sub-info">
              <p className="game-genre">{primaryGenre} •</p>
              <p className="game-meta">{metaText}</p>
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
          >
            <img src={addIcon} alt="Remove from library" />
          </button>
        )}
      </div>
    </div>
  );
}

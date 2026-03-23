// GamePage.jsx
import React, { useState, useEffect, useRef } from "react";
import parse from "html-react-parser";
import loadingCircle from "../assets/images/loading.gif";


import defaultBackground from "../assets/images/background.png";
import "../styles/gamePage.css";

import { useNavigate } from "react-router-dom";

// 🔐 Firebase imports
import { db } from "../firebase/firestore";

import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  updateDoc,
  arrayRemove,
} from "../firebase/firestore";

// ✅ Backend base (Render in prod, override for local if you want)
const BACKEND_BASE =
  process.env.REACT_APP_BACKEND_BASE ||
  "https://game-database-backend.onrender.com";

export default function GamePage({auth}) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [gameScreenshots, setGameScreenshots] = useState([]);

  // videos (kept even if you don't render yet)
  const [gameVideos, setGameVideos] = useState([]);

  // ✅ ITAD cover (boxart) (kept)
  const [itadCoverUrl, setItadCoverUrl] = useState(null);
  const [itadChecked, setItadChecked] = useState(false);

  // ✅ RAWG store links
  const [rawgStores, setRawgStores] = useState([]);
  const [rawgStoresChecked, setRawgStoresChecked] = useState(false);

  // ✅ ITAD store links (from AnyDeal API via your backend /api/itad/stores)
  const [itadStores, setItadStores] = useState([]);
  const [itadStoresChecked, setItadStoresChecked] = useState(false);

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

  // draggable screenshots row
  const screenshotsRowRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  const addressBarLink = window.location.href;
  const key = "?key=99cd09f6c33b42b5a24a9b447ee04a81";


  function requireAuth(actionLabel) {
    const user = auth.currentUser;
    if (!user) {
      alert(`Please sign in to ${actionLabel}.`);
      navigate("/signin");
      return false;
    }
    return true;
  }

  /**
   * ✅ OLD doc-id convention:
   * Firestore doc id === RAWG id as a string, e.g. "3498"
   */
  function getLibraryDocId(rawgId) {
    if (rawgId === null || rawgId === undefined) return null;
    return String(rawgId);
  }

  // ✅ Frontend helper: infer store name from URL when RAWG returns "Store"
  function inferStoreNameFromUrl(url) {
    if (!url) return "Store";
    const u = String(url).toLowerCase();

    if (u.includes("store.steampowered.com")) return "Steam";
    if (u.includes("gog.com")) return "GOG";
    if (u.includes("epicgames.com/store")) return "Epic Games Store";
    if (u.includes("store.playstation.com")) return "PlayStation Store";
    if (u.includes("xbox.com") || u.includes("microsoft.com/store"))
      return "Microsoft Store";
    if (u.includes("nintendo.com")) return "Nintendo eShop";
    if (u.includes("humblebundle.com")) return "Humble Bundle";
    if (u.includes("itch.io")) return "itch.io";
    if (u.includes("greenmangaming.com")) return "Green Man Gaming";
    if (u.includes("ea.com") || u.includes("origin.com")) return "EA";
    if (u.includes("store.ubi.com") || u.includes("ubisoft.com"))
      return "Ubisoft Store";
    if (u.includes("battle.net")) return "Battle.net";

    // Fallback: use hostname
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      const parts = host.split(".");
      const base = parts[0] === "store" ? parts[1] : parts[0];
      return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Store";
    } catch {
      return "Store";
    }
  }

  // ✅ RAWG-only: nice ordering + dedupe by url
  function normalizeAndSortStores(list) {
    const seen = new Set();
    const deduped = (Array.isArray(list) ? list : [])
      .filter((x) => x?.url)
      .filter((x) => {
        const url = String(x.url);
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });

    const priority = {
      Steam: 1,
      GOG: 2,
      "Epic Games Store": 3,
      "PlayStation Store": 4,
      "Microsoft Store": 5,
      "Nintendo eShop": 6,
      "Humble Bundle": 7,
      "Green Man Gaming": 8,
      "itch.io": 9,
      EA: 10,
      "Ubisoft Store": 11,
      "Battle.net": 12,
    };

    return deduped.sort((a, b) => {
      const pa = priority[a.storeName] ?? 999;
      const pb = priority[b.storeName] ?? 999;
      if (pa !== pb) return pa - pb;
      return String(a.storeName || "").localeCompare(String(b.storeName || ""));
    });
  }

  // ✅ Dedupe ITAD offers by URL (keeps first occurrence)
  function dedupeByUrl(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
      .filter((x) => x?.url)
      .filter((x) => {
        const u = String(x.url);
        if (seen.has(u)) return false;
        seen.add(u);
        return true;
      });
  }

  // ✅ remove a gameId from ALL groups when deleting from library
  async function removeGameFromAllGroups(userId, gameIdStr) {
    try {
      const groupsRef = collection(db, "users", userId, "groups");
      const snap = await getDocs(groupsRef);

      const updates = snap.docs.map(async (groupSnap) => {
        const data = groupSnap.data();
        const ids = Array.isArray(data.gameIds) ? data.gameIds.map(String) : [];

        if (!ids.includes(String(gameIdStr))) return;

        await updateDoc(groupSnap.ref, {
          gameIds: arrayRemove(String(gameIdStr)),
        });
      });

      await Promise.all(updates);
    } catch (err) {
      console.error("Error removing game from all groups:", err);
    }
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
    const videosUrl = baseUrl + rawId + "/movies" + key;

    searchForData(gameUrl);
    searchForImages(screenshotsUrl);
    searchForVideos(videosUrl);
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

  /* =============================================================================
    ✅ ITAD LOOKUP (cover) + ✅ ITAD STORES (AnyDeal offers via /api/itad/stores)
    - lookup returns { found, itadId, game }
    - stores returns { offers: [...] } (per your server logs)
  ============================================================================= */
  useEffect(() => {
    const fetchItad = async () => {
      try {
        if (!gameData?.name) return;

        // reset per game
        setItadChecked(false);
        setItadCoverUrl(null);
        setItadStoresChecked(false);
        setItadStores([]);

        // 1) Lookup by title (gets itadId + cover assets)
        const lookupUrl =
          `${BACKEND_BASE}/api/itad/lookup?title=` +
          encodeURIComponent(gameData.name) +
          `&t=${Date.now()}`;

        console.log("🟦 ITAD lookup:", lookupUrl);

        const r = await fetch(lookupUrl, { credentials: "include" });
        const data = await r.json().catch(() => ({}));

        console.log("🟩 ITAD lookup result:", data);

        // cover
        const boxart =
          data?.game?.assets?.boxart ||
          data?.game?.assets?.banner400 ||
          data?.game?.assets?.banner300 ||
          data?.game?.assets?.banner145 ||
          null;

        if (data?.found && boxart) {
          setItadCoverUrl(boxart);
        } else {
          setItadCoverUrl(null);
        }

        // 2) Stores by itadId (this is where your AnyDeal offers come from)
        if (data?.found && data?.itadId) {
          const storesUrl =
            `${BACKEND_BASE}/api/itad/stores?itadId=` +
            encodeURIComponent(data.itadId) +
            `&country=US&t=${Date.now()}`;

          console.log("🟦 ITAD stores:", storesUrl);

          const r2 = await fetch(storesUrl, { credentials: "include" });
          const data2 = await r2.json().catch(() => ({}));

          console.log("🟩 ITAD stores result:", data2);

          const offers = Array.isArray(data2?.offers) ? data2.offers : [];

          // Normalize to { url, ... } and keep RAW beyond that
          const rawOffers = dedupeByUrl(
            offers
              .map((x) => ({
                ...x,
                url: x?.url || x?.link || x?.href || null,
              }))
              .filter((x) => !!x.url)
          );

          setItadStores(rawOffers);
        } else {
          setItadStores([]);
        }
      } catch (err) {
        console.error("ITAD fetch failed:", err);
        setItadCoverUrl(null);
        setItadStores([]);
      } finally {
        setItadChecked(true);
        setItadStoresChecked(true);
      }
    };

    if (gameData?.name) fetchItad();
  }, [gameData?.name]);

  /* =============================================================================
    ✅ RAWG STORE LINKS
    - Normalized/sorted (YOUR existing behavior)
  ============================================================================= */
  useEffect(() => {
    const fetchRawgStores = async () => {
      try {
        if (!gameData?.id) return;

        setRawgStoresChecked(false);
        setRawgStores([]);

        const storesUrl =
          `https://api.rawg.io/api/games/${gameData.id}/stores` + key;

        console.log("🟪 RAWG stores request:", storesUrl);

        const r = await fetch(storesUrl);
        const data = await r.json().catch(() => ({}));

        const results = Array.isArray(data?.results) ? data.results : [];

        const normalized = results
          .map((s) => {
            const url = s?.url || s?.url_en || s?.url_ru || null;

            const rawName = s?.store?.name || "Store";
            const storeName =
              rawName && rawName !== "Store"
                ? rawName
                : inferStoreNameFromUrl(url);

            return { storeName, url };
          })
          .filter((s) => !!s.url);

        const finalList = normalizeAndSortStores(normalized);

        setRawgStores(finalList);

        console.log("🟪 RAWG store links (frontend):", finalList);
      } catch (err) {
        console.error("RAWG stores fetch failed:", err);
        setRawgStores([]);
      } finally {
        setRawgStoresChecked(true);
      }
    };

    if (gameData?.id) fetchRawgStores();
  }, [gameData?.id]);

  // 🔍 After game data loads, check current state in user's library
  useEffect(() => {
    const checkLibraryState = async () => {
      const user = auth.currentUser;
      const docId = getLibraryDocId(gameData?.id);

      if (!user || !docId) {
        setIsInLibrary(false);
        setIsFavorite(false);
        setIsCompleted(false);
        return;
      }

      try {
        const ref = doc(db, "users", user.uid, "library", docId);
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
            gameIds: Array.isArray(data.gameIds) ? data.gameIds.map(String) : [],
          };
        });

        groups.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
        setUserGroups(groups);
      } catch (err) {
        console.error("Error loading user groups:", err);
      }
    };

    if (gameData?.id) loadGroups();
  }, [gameData]);

  // Helper: base payload used whenever we create/update a library doc
  function buildBaseGamePayload() {
    if (!gameData) return {};

    return {
      id: gameData.id,
      rawgId: gameData.id,

      name: gameData.name,
      title: gameData.name,
      slug: gameData.slug || "",

      background_image: gameData.background_image || null,
      backgroundImage: gameData.background_image || null,

      released: gameData.released || null,
      metacritic: gameData.metacritic ?? null,
      rating: gameData.rating ?? null,

      platforms:
        gameData.platforms?.map((p) => p?.platform?.name).filter(Boolean) || [],
      genres: gameData.genres?.map((g) => g?.name).filter(Boolean) || [],

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
    const docId = getLibraryDocId(gameData.id);
    if (!docId) return;

    const docRef = doc(db, "users", user.uid, "library", docId);

    try {
      setSavingLibrary(true);

      if (isInLibrary) {
        await deleteDoc(docRef);
        await removeGameFromAllGroups(user.uid, String(docId));

        setIsInLibrary(false);
        setIsCompleted(false);
        setIsFavorite(false);

        setUserGroups((prev) =>
          prev.map((g) => ({
            ...g,
            gameIds: Array.isArray(g.gameIds)
              ? g.gameIds.filter((id) => String(id) !== String(docId))
              : [],
          }))
        );
      } else {
        await setDoc(
          docRef,
          {
            ...buildBaseGamePayload(),
            status: "backlog",
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
    const docId = getLibraryDocId(gameData.id);
    if (!docId) return;

    const docRef = doc(db, "users", user.uid, "library", docId);

    try {
      setSavingCompleted(true);

      if (isCompleted) {
        await setDoc(
          docRef,
          { ...buildBaseGamePayload(), status: "backlog" },
          { merge: true }
        );
        setIsCompleted(false);
        setIsInLibrary(true);
      } else {
        await setDoc(
          docRef,
          { ...buildBaseGamePayload(), status: "completed" },
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

  // ⭐ Toggle favorite
  async function handleToggleFavorite(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!gameData) return;
    if (!requireAuth("favorite games")) return;

    const user = auth.currentUser;
    const docId = getLibraryDocId(gameData.id);
    if (!docId) return;

    const docRef = doc(db, "users", user.uid, "library", docId);

    try {
      setSavingFavorite(true);

      await setDoc(
        docRef,
        {
          ...buildBaseGamePayload(),
          isFavorite: !isFavorite,
          status: isCompleted ? "completed" : "backlog",
        },
        { merge: true }
      );

      setIsFavorite(!isFavorite);
      setIsInLibrary(true);
    } catch (error) {
      console.error("Error updating favorite:", error);
      alert("There was a problem updating favorites. Please try again.");
    } finally {
      setSavingFavorite(false);
    }
  }

  // ✅ Toggle a game in/out of a group (click again to remove)
  async function handleToggleGroup(groupId) {
    if (!gameData) return;
    if (!requireAuth("manage groups")) return;

    const user = auth.currentUser;
    const libraryDocId = getLibraryDocId(gameData.id);
    if (!libraryDocId) return;

    const libraryRef = doc(db, "users", user.uid, "library", libraryDocId);
    const groupRef = doc(db, "users", user.uid, "groups", groupId);

    try {
      setSavingGroupId(groupId);

      // Ensure the library doc exists so the group can reference it
      await setDoc(
        libraryRef,
        {
          ...buildBaseGamePayload(),
          status: isCompleted ? "completed" : "backlog",
          isFavorite: !!isFavorite,
        },
        { merge: true }
      );
      setIsInLibrary(true);

      // Read group + compute new list
      const snap = await getDoc(groupRef);
      if (!snap.exists()) {
        console.error("Group not found:", groupId);
        return;
      }

      const data = snap.data();
      const currentIds = Array.isArray(data.gameIds)
        ? data.gameIds.map(String)
        : [];
      const idStr = String(libraryDocId);

      const isAlreadyInGroup = currentIds.includes(idStr);

      if (isAlreadyInGroup) {
        // ✅ remove from group
        await updateDoc(groupRef, {
          gameIds: arrayRemove(idStr),
        });

        // Optimistic UI update
        setUserGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  gameIds: (g.gameIds || []).filter((x) => String(x) !== idStr),
                }
              : g
          )
        );
      } else {
        // ✅ add to group (merge without duplicates)
        const updatedIds = [...currentIds, idStr];
        await setDoc(groupRef, { gameIds: updatedIds }, { merge: true });

        // Optimistic UI update
        setUserGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, gameIds: updatedIds } : g))
        );
      }
    } catch (err) {
      console.error("Error toggling game in group:", err);
      alert("There was a problem updating this group.");
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

  function closeScreenshot() {
    setIsFullScreenshotOpen(false);
    setActiveScreenshotIndex(null);
  }

  function showPrevScreenshot() {
    if (!gameScreenshots.length || activeScreenshotIndex === null) return;
    setActiveScreenshotIndex(
      (prevIndex) =>
        (prevIndex - 1 + gameScreenshots.length) % gameScreenshots.length
    );
  }

  function showNextScreenshot() {
    if (!gameScreenshots.length || activeScreenshotIndex === null) return;
    setActiveScreenshotIndex(
      (prevIndex) => (prevIndex + 1) % gameScreenshots.length
    );
  }

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
    e.preventDefault();
    const x = e.pageX - screenshotsRowRef.current.offsetLeft;
    const walk = x - dragStartX.current;
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

  function stopDraggingTouch() {
    setIsDragging(false);
  }

  if (!gameData) {
    return (
      <div className="game-page-shell">

        <div className="game-page-container loading-state">
          <img src={loadingCircle} alt="Loading..." />
          <p>Loading Game...</p>
        </div>
      </div>
    );
  }

  // ✅ Final hero cover URL (prevents RAWG flash while ITAD is pending)
  const heroCoverUrl = itadCoverUrl
    ? itadCoverUrl
    : !itadChecked
    ? defaultBackground
    : gameData.background_image || defaultBackground;

  // Normalize genres/platforms for rendering (avoids rendering objects)
  const genreNames = Array.isArray(gameData?.genres)
    ? gameData.genres
        .map((g) => (typeof g === "string" ? g : g?.name))
        .filter(Boolean)
    : [];

  const platformNames = Array.isArray(gameData?.platforms)
    ? gameData.platforms
        .map((p) =>
          typeof p === "string" ? p : p?.platform?.name || p?.name || null
        )
        .filter(Boolean)
    : [];

  // ✅ combine store lists (ITAD offers first, RAWG normalized after)
  const storesChecked = rawgStoresChecked && itadStoresChecked;
  const combinedStores = [
    ...(Array.isArray(itadStores) ? itadStores : []),
    ...(Array.isArray(rawgStores) ? rawgStores : []),
  ];

  function getStoreLabel(item) {
    // RAWG
    if (item?.storeName) return item.storeName;

    // ITAD offers: most common is item.shop.name
    return (
      item?.shop?.name ||
      item?.shopName ||
      item?.shop ||
      item?.store ||
      item?.name ||
      item?.title ||
      "Store"
    );
  }

  // ✅ Helper: pill buttons for store links (ITAD + RAWG)
  function renderStorePills() {
    if (storesChecked && combinedStores.length === 0) {
      return <p>No store links found.</p>;
    }
    if (!storesChecked || !combinedStores.length) {
      return <p>Loading store links…</p>;
    }

    return (
      <div className="store-pills">
        {combinedStores.map((s, idx) => {
          const label = getStoreLabel(s);
          const url = s?.url;

          if (!url) return null;

          return (
            <a
              key={`${label}-${idx}-${url}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="store-pill"
              title={label}
            >
              <span className="store-pill__name">{label}</span>
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="game-page-shell">

      <div className="game-page-container">
        {/* HERO SECTION */}
        <section className="game-hero">
          <div className="game-cover-wrapper">
            <div className="game-cover">
              <div
                className="game-cover-img"
                style={{ backgroundImage: `url(${heroCoverUrl})` }}
                title={
                  itadCoverUrl
                    ? "Cover source: IsThereAnyDeal"
                    : itadChecked && gameData.background_image
                    ? "Cover source: RAWG"
                    : "Cover source: placeholder"
                }
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
                <span className="metascore-pill">
                  {gameData.metacritic ?? "N/A"}
                </span>
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
                {genreNames.length ? (
                  genreNames.map((name) => <p key={name}>{name}</p>)
                ) : (
                  <p>Unlisted</p>
                )}
              </div>
            </div>

            <div className="game-platforms">
              <span className="meta-label">Platforms</span>
              <br />
              <div className="platforms">
                {platformNames.length ? (
                  platformNames.map((name) => <p key={name}>{name}</p>)
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
                <div
                  className={
                    "dropdown group-dropdown" + (groupDropdownOpen ? " open" : "")
                  }
                >
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
                        const libraryDocId = getLibraryDocId(gameData.id);
                        const inGroup = Array.isArray(group.gameIds)
                          ? group.gameIds.some(
                              (id) => String(id) === String(libraryDocId)
                            )
                          : false;

                        const isBusy = savingGroupId === group.id;

                        return (
                          <button
                            key={group.id}
                            type="button"
                            className={
                              "dropdown-item" + (inGroup ? " in-group" : "")
                            }
                            disabled={isBusy}
                            onClick={() => handleToggleGroup(group.id)}
                            title={
                              inGroup
                                ? "Click to remove from this group"
                                : "Click to add to this group"
                            }
                          >
                            <span className="dropdown-item-label">
                              {group.name}
                            </span>
                            <span className="dropdown-item-status">
                              {isBusy
                                ? "Updating..."
                                : inGroup
                                ? "✓ In group (click to remove)"
                                : "＋ Add"}
                            </span>
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

            {/* ✅ ITAD (AnyDeal) + RAWG store pills */}
            <div className="digital-stores">
              <h3 style={{ marginTop: 16 }}>Digital Stores</h3>
              <p className="digital-store-dis">
                Store links come from IsThereAnyDeal (when available) and RAWG as
                a fallback, and may be incomplete. This game may be available on
                other stores/platforms not listed here.
              </p>
              {renderStorePills()}
            </div>
          </article>

          <aside className="game-sidebar">
            <div className="game-panel">
              <h2 className="panel-title">Game details</h2>
              <p className="panel-sub">Quick facts at a glance.</p>

              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-label">Release date</span>
                  <span className="stat-value">
                    {gameData.released || "Unknown"}
                  </span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">Developer</span>
                  <span className="stat-value">
                    {gameData.developers?.[0]?.name || "Unknown"}
                  </span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">Publisher</span>
                  <span className="stat-value">
                    {gameData.publishers?.[0]?.name || "Unknown"}
                  </span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">Age rating</span>
                  <span className="stat-value">
                    {gameData.esrb_rating?.name || "Unrated"}
                  </span>
                </div>
              </div>
            </div>

            <div className="game-panel">
              <h2 className="panel-title">Tags</h2>
              <div className="game-tags-cloud">
                {gameData.tags?.length ? (
                  gameData.tags.map((tag) => (
                    <span key={tag.id}>{tag.name}</span>
                  ))
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
            onTouchEnd={stopDraggingTouch}
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
        <div
          id="full-screenshot"
          className="full-screenshot"
          ref={fullscreenRef}
        >
          <button className="screenshot-close-btn" onClick={closeScreenshot}>
            X
          </button>
          <img
            src={
              activeScreenshotIndex !== null &&
              gameScreenshots[activeScreenshotIndex]
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

    </div>
  );
}

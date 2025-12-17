import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import Header from "../components/Header";
import Footer from "../components/Footer";

import downChevron from "../assets/images/down_chevron.png";
import plusIcon from "../assets/images/plus-icon.png";

import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

import "../styles/yourLibrary.css";

/* =============================================================================
  CONFIG
============================================================================= */
const ITEMS_PER_PAGE = 12;
const BACKEND_BASE = "https://game-database-backend.onrender.com";

export default function YourLibrary() {
  /* ===========================================================================
    STATE: AUTH + CORE LIBRARY DATA
  =========================================================================== */
  const [authUser, setAuthUser] = useState(null);

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    backlog: 0,
    playing: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const [libraryGames, setLibraryGames] = useState([]);

  /* ===========================================================================
    STATE: FILTERS (STATUS + GROUPS)
  =========================================================================== */
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeGroupIds, setActiveGroupIds] = useState(["all-platforms"]);

  /* ===========================================================================
    STATE: PAGINATION
  =========================================================================== */
  const [currentPage, setCurrentPage] = useState(1);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);

  /* ===========================================================================
    STATE: GROUP BUILDER (MODAL -> group mode)
  =========================================================================== */
  const [panelMode, setPanelMode] = useState("group"); // "group" | "import"
  const [showGameSelection, setShowGameSelection] = useState(false);

  const [selectedGroupGameIds, setSelectedGroupGameIds] = useState([]);

  const [filterName, setFilterName] = useState("");
  const [field, setField] = useState("platform");
  const [operator, setOperator] = useState("eq");
  const [value, setValue] = useState("");

  const [editingGroupId, setEditingGroupId] = useState(null);

  /* ===========================================================================
    STATE: SCAN IMPORT (MODAL -> import mode)
  =========================================================================== */
  const scanFileInputRef = useRef(null);

  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");

  // raw OCR combined (kept for fallback/reference; not shown)
  const [scanText, setScanText] = useState("");

  // final LLM-cleaned alphabetical list (one title per line)
  const [scanCleanText, setScanCleanText] = useState("");

  const [scanPreviewUrls, setScanPreviewUrls] = useState([]);

  const [candidates, setCandidates] = useState([]); // [{ id, raw, cleaned }]
  const [selectedCandidateIds, setSelectedCandidateIds] = useState(new Set());

  // matching state per candidate
  const [candidateMatches, setCandidateMatches] = useState({});
  // { [candidateId]: { loading, results, chosen, error } }

  /* ===========================================================================
    CONSTANTS: PERMANENT GROUPS + GROUP LIST
  =========================================================================== */
  const ALL_PLATFORMS_FILTER = {
    id: "all-platforms",
    name: "All Platforms",
    gameIds: null,
  };

  const UNGROUPED_FILTER = {
    id: "ungrouped",
    name: "Ungrouped",
    gameIds: "__UNGROUPED__",
  };

  const [customFilters, setCustomFilters] = useState([
    ALL_PLATFORMS_FILTER,
    UNGROUPED_FILTER,
  ]);

  /* ===========================================================================
    HELPERS: SORTING
  =========================================================================== */
  function sortStringsAlpha(list) {
    return [...(list || [])].sort((a, b) =>
      String(a || "").localeCompare(String(b || ""), undefined, {
        sensitivity: "base",
      })
    );
  }

  function sortCandidatesAlpha(list) {
    return [...(list || [])].sort((a, b) =>
      String(a.cleaned || a.raw || "").localeCompare(
        String(b.cleaned || b.raw || ""),
        undefined,
        { sensitivity: "base" }
      )
    );
  }

  /* ===========================================================================
    HELPERS: SAFE RENDERING (FIXES OBJECT-RENDER CRASHES)
  =========================================================================== */
  function normalizeGenre(g) {
    if (!g) return "";
    if (typeof g === "string") return g;
    if (typeof g === "object") return g.name || g.slug || "";
    return "";
  }

  function getPrimaryGenreFromGame(game) {
    const genresArray =
      game?.genres || game?.genreList || game?.genre_names || [];
    if (Array.isArray(genresArray)) return normalizeGenre(genresArray[0]);
    return normalizeGenre(genresArray);
  }

  function safeText(v, fallback = "") {
    if (typeof v === "string") return v;
    if (v && typeof v === "object") return v.name || v.title || v.slug || fallback;
    if (typeof v === "number") return String(v);
    return fallback;
  }

  /* ===========================================================================
    HELPERS: GROUP SELECTION PERSISTENCE
  =========================================================================== */
  function setActiveGroups(next) {
    setActiveGroupIds((prev) => {
      const nextIdsRaw = typeof next === "function" ? next(prev) : next;

      const nextIds =
        Array.isArray(nextIdsRaw) && nextIdsRaw.length > 0
          ? nextIdsRaw
          : ["all-platforms"];

      if (typeof window !== "undefined") {
        const storageKey = authUser
          ? `vgdb_lastGroupIds_${authUser.uid}`
          : "vgdb_lastGroupIds";
        window.localStorage.setItem(storageKey, JSON.stringify(nextIds));
      }

      return nextIds;
    });
  }

  /* ===========================================================================
    UI HANDLERS: STATUS + GROUP FILTERS
  =========================================================================== */
  function handleStatusFilterChange(nextStatus) {
    setStatusFilter(nextStatus);
    setCurrentPage(1);
    setIsPageDropdownOpen(false);
  }

  function handleToggleGroup(groupId) {
    setActiveGroups((prev) => {
      let nextIds;

      if (groupId === "all-platforms") {
        nextIds = ["all-platforms"];
      } else if (groupId === "ungrouped") {
        nextIds = ["ungrouped"];
      } else {
        const prevArr = Array.isArray(prev) ? prev : ["all-platforms"];
        const hasPermanent =
          prevArr.includes("all-platforms") || prevArr.includes("ungrouped");

        const current = hasPermanent ? [] : [...prevArr];

        const index = current.indexOf(groupId);
        if (index >= 0) current.splice(index, 1);
        else current.push(groupId);

        nextIds = current.length > 0 ? current : ["all-platforms"];
      }

      return nextIds;
    });

    setCurrentPage(1);
    setIsPageDropdownOpen(false);
  }

  /* ===========================================================================
    SCAN IMPORT: OPEN PICKER
  =========================================================================== */
  function openScanFilePicker() {
    setScanError("");
    setScanText("");
    setScanCleanText("");
    setCandidates([]);
    setSelectedCandidateIds(new Set());
    setCandidateMatches({});
    if (scanFileInputRef.current) scanFileInputRef.current.click();
  }

  /* ===========================================================================
    SCAN IMPORT: CANDIDATE CONTROLS
  =========================================================================== */
  function toggleCandidate(candidateId) {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  }

  function selectAllCandidates() {
    setSelectedCandidateIds(new Set(candidates.map((c) => c.id)));
  }

  function deselectAllCandidates() {
    setSelectedCandidateIds(new Set());
  }

  function removeCandidate(candidateId) {
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));

    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      next.delete(candidateId);
      return next;
    });

    setCandidateMatches((prev) => {
      if (!prev || !prev[candidateId]) return prev;
      const next = { ...prev };
      delete next[candidateId];
      return next;
    });
  }

  /* ===========================================================================
    SCAN IMPORT: MATCH A CANDIDATE AGAINST YOUR GAME SEARCH
    NOTE: requires backend route GET /api/search-game?q=...
  =========================================================================== */
  async function handleFindMatchForCandidate(candidateId) {
    const c = candidates.find((x) => x.id === candidateId);
    if (!c) return;

    const q = (c.cleaned || "").trim();
    if (!q) return;

    setCandidateMatches((prev) => ({
      ...prev,
      [candidateId]: { loading: true, results: [], chosen: null, error: "" },
    }));

    try {
      const url = `${BACKEND_BASE}/api/search-game?q=${encodeURIComponent(q)}`;

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Search failed");

      const results = Array.isArray(data?.results) ? data.results : [];

      setCandidateMatches((prev) => ({
        ...prev,
        [candidateId]: {
          loading: false,
          results,
          chosen: results[0] || null,
          error: "",
        },
      }));
    } catch (e) {
      setCandidateMatches((prev) => ({
        ...prev,
        [candidateId]: {
          loading: false,
          results: [],
          chosen: null,
          error: e?.message || "Match failed",
        },
      }));
    }
  }

  /* ===========================================================================
    MATCHING: CHOOSE RESULT + ADD TO LIBRARY
  =========================================================================== */
  function getResultId(r) {
    return (
      r?.rawgId ||
      r?.id ||
      r?.gameId ||
      r?.slug ||
      r?.name ||
      r?.title ||
      null
    );
  }

  function normalizeResultToLibraryDoc(r) {
    const title = r?.name || r?.title || r?.gameTitle || r?.slug || "Untitled game";

    const backgroundImage =
      r?.background_image ||
      r?.backgroundImage ||
      r?.image ||
      r?.coverImage ||
      "";

    const genres =
      r?.genres ||
      r?.genreList ||
      r?.genre_names ||
      (Array.isArray(r?.tags) ? r.tags : []);

    const metacritic = r?.metacritic ?? r?.metacriticScore ?? r?.metaScore ?? null;

    const platforms =
      r?.platforms ||
      r?.parent_platforms ||
      r?.platform ||
      r?.platformName ||
      "";

    return {
      title,
      rawgId: r?.id ?? r?.rawgId ?? null,
      slug: r?.slug ?? null,
      backgroundImage,
      genres,
      metacritic,
      platforms,
      status: "backlog",
      _source: "scan_match",
      _raw: r || null,
    };
  }

  function chooseMatch(candidateId, resultObj) {
    setCandidateMatches((prev) => {
      const existing = prev?.[candidateId] || {
        loading: false,
        results: [],
        chosen: null,
        error: "",
      };

      return {
        ...prev,
        [candidateId]: {
          ...existing,
          chosen: resultObj || null,
        },
      };
    });
  }

  async function addChosenMatchToLibrary(candidateId) {
    if (!authUser) {
      alert("You must be signed in to add games.");
      return;
    }

    const m = candidateMatches?.[candidateId];
    const chosen = m?.chosen;

    if (!chosen) {
      alert("Pick a match first.");
      return;
    }

    const resultId = getResultId(chosen);
    if (!resultId) {
      alert("This match doesn't have a usable ID to save.");
      return;
    }

    try {
      // ✅ REVERTED: docId is ONLY the rawg id (like before)
      const docId = String(resultId);
      const gameDocRef = doc(db, "users", authUser.uid, "library", docId);

      const payload = normalizeResultToLibraryDoc(chosen);
      await setDoc(gameDocRef, payload, { merge: true });

      // update UI immediately
      setLibraryGames((prev) => {
        const exists = (prev || []).some((g) => String(g.id) === String(docId));
        if (exists) return prev;

        const next = [{ id: docId, ...payload }, ...(prev || [])];
        return next.sort((a, b) =>
          String(a.title || "").localeCompare(String(b.title || ""), undefined, {
            sensitivity: "base",
          })
        );
      });

      setCandidateMatches((prev) => ({
        ...prev,
        [candidateId]: { ...(prev?.[candidateId] || {}), error: "" },
      }));
    } catch (e) {
      console.error("Add chosen match failed:", e);
      alert(e?.message || "Failed to add game.");
    }
  }

  async function matchSelectedCandidates() {
    const ids = candidates
      .map((c) => c.id)
      .filter((id) => selectedCandidateIds.has(id));

    for (const id of ids) {
      const existing = candidateMatches?.[id];
      const hasResults =
        Array.isArray(existing?.results) && existing.results.length > 0;
      if (hasResults) continue;

      // eslint-disable-next-line no-await-in-loop
      await handleFindMatchForCandidate(id);
    }
  }

  async function importAllMatchedSelected() {
    if (!authUser) {
      alert("You must be signed in to import games.");
      return;
    }

    const ids = candidates
      .map((c) => c.id)
      .filter((id) => selectedCandidateIds.has(id));

    let imported = 0;

    for (const candidateId of ids) {
      const m = candidateMatches?.[candidateId];
      const chosen = m?.chosen;

      if (!chosen && Array.isArray(m?.results) && m.results.length > 0) {
        chooseMatch(candidateId, m.results[0]);
      }

      // eslint-disable-next-line no-await-in-loop
      await addChosenMatchToLibrary(candidateId);
      imported += 1;
    }

    alert(`Imported ${imported} game(s) to your library.`);
  }

  /* ===========================================================================
    SCAN IMPORT: AI CLEANUP (SERVER ROUTE)
  =========================================================================== */
  async function extractCandidatesWithLLM(text) {
    const cleanedText = String(text || "").trim();
    if (!cleanedText) return { sortedTitles: [], nextCandidates: [] };

    const res = await fetch(`${BACKEND_BASE}/api/extract-game-candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text: cleanedText }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || "LLM extract failed");
    }

    const titles = Array.isArray(data?.titles) ? data.titles : [];

    // de-dupe (case-insensitive)
    const seen = new Set();
    const uniq = [];
    for (const t of titles) {
      const s = String(t || "").trim();
      if (!s) continue;
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(s);
    }

    const sortedTitles = sortStringsAlpha(uniq);

    const now = Date.now();
    const nextCandidatesRaw = sortedTitles.map((t, idx) => ({
      id: `${now}_${idx}`,
      raw: t,
      cleaned: t,
    }));
    const nextCandidates = sortCandidatesAlpha(nextCandidatesRaw);

    return { sortedTitles, nextCandidates };
  }

  /* ===========================================================================
    SCAN IMPORT: UPLOAD FLOW (MULTI-IMAGE OCR -> COMBINE -> LLM -> THEN SHOW)
  =========================================================================== */
  async function handleScanFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    e.target.value = "";

    setScanLoading(true);
    setScanError("");

    // hide results until finished
    setScanText("");
    setScanCleanText("");
    setCandidates([]);
    setSelectedCandidateIds(new Set());
    setCandidateMatches({});

    setScanPreviewUrls((prev) => {
      try {
        prev.forEach((u) => URL.revokeObjectURL(u));
      } catch {
        // ignore
      }
      return [];
    });

    const nextUrls = files.map((file) => URL.createObjectURL(file));
    setScanPreviewUrls(nextUrls);

    try {
      const results = [];

      for (const file of files) {
        const fd = new FormData();
        fd.append("image", file);

        const res = await fetch(`${BACKEND_BASE}/api/scan-image`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });

        const contentType = res.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
          ? await res.json().catch(() => ({}))
          : { message: await res.text().catch(() => "") };

        if (!res.ok) {
          const msg =
            payload?.error ||
            payload?.message ||
            `’Scan failed (HTTP ${res.status}).`;
          throw new Error(msg);
        }

        const raw =
          payload?.rawText ||
          payload?.text ||
          payload?.result ||
          payload?.ocrText ||
          "";

        results.push(String(raw || "").trim());
      }

      const combined = results.filter(Boolean).join("\n\n---\n\n");
      setScanText(combined); // internal only

      const { sortedTitles, nextCandidates } = await extractCandidatesWithLLM(
        combined
      );

      // reveal AFTER LLM is done
      setScanCleanText(sortedTitles.join("\n"));
      setCandidates(nextCandidates);
      setSelectedCandidateIds(new Set(nextCandidates.map((c) => c.id)));
    } catch (err) {
      console.error("🔥 Scan request error:", err);
      setScanError(err?.message || "Scan request failed.");
    } finally {
      setScanLoading(false);
    }
  }

  /* ===========================================================================
    EFFECT: CLEANUP PREVIEW URLS
  =========================================================================== */
  useEffect(() => {
    return () => {
      try {
        scanPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      } catch {
        // ignore
      }
    };
  }, [scanPreviewUrls]);

  /* ===========================================================================
    STEAM: LOGIN + SYNC (CURRENTLY LOGS TITLES)
  =========================================================================== */
  function handleSteamLogin() {
    window.location.href = `${BACKEND_BASE}/auth/steam`;
  }

  async function handleSteamSync() {
    try {
      const meRes = await fetch(`${BACKEND_BASE}/api/me`, {
        credentials: "include",
      });

      const meData = await meRes.json();
      console.log("✅ Steam /api/me:", meData);

      if (!meRes.ok || !meData?.loggedIn) {
        window.location.href = `${BACKEND_BASE}/auth/steam`;
        return;
      }

      const gamesRes = await fetch(`${BACKEND_BASE}/api/steam/owned-games`, {
        credentials: "include",
      });

      const gamesData = await gamesRes.json();
      console.log("🎮 Steam owned-games:", gamesData);

      if (!gamesRes.ok) {
        alert(
          "Could not fetch Steam library. Your Steam Game Details might be private."
        );
        return;
      }

      console.log(
        "🎮 Steam titles:",
        (gamesData.games || []).map((g) => g.name)
      );
    } catch (err) {
      console.error("🔥 Steam sync error:", err);
    }
  }

  /* ===========================================================================
    EFFECT: AUTO-RUN STEAM SYNC AFTER REDIRECT (?steam=linked)
  =========================================================================== */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("steam") === "linked") {
      handleSteamSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===========================================================================
    EFFECT: AUTH LISTENER -> LOAD LIBRARY + GROUPS
  =========================================================================== */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);

      if (!user) {
        setStats({ total: 0, completed: 0, backlog: 0, playing: 0 });
        setLibraryGames([]);
        setCustomFilters([ALL_PLATFORMS_FILTER, UNGROUPED_FILTER]);
        setActiveGroupIds(["all-platforms"]);
        setCurrentPage(1);
        setLoadingStats(false);
        return;
      }

      try {
        const libraryRef = collection(db, "users", user.uid, "library");
        const snapshot = await getDocs(libraryRef);

        let total = 0;
        let completed = 0;
        let backlog = 0;
        let playing = 0;
        let games = [];

        snapshot.forEach((docSnap) => {
          total += 1;
          const data = docSnap.data();

          const title =
            safeText(data.title) ||
            safeText(data.name) ||
            safeText(data.gameTitle) ||
            safeText(data.game_name) ||
            "Untitled game";

          games.push({ id: String(docSnap.id), title, ...data });

          const status = data.status?.toLowerCase?.() || "";
          switch (status) {
            case "completed":
              completed++;
              break;
            case "backlog":
              backlog++;
              break;
            case "playing":
              playing++;
              break;
            default:
              break;
          }
        });

        const sortedGames = games.sort((a, b) =>
          String(a.title || "").localeCompare(String(b.title || ""), undefined, {
            sensitivity: "base",
          })
        );

        setStats({ total, completed, backlog, playing });
        setLibraryGames(sortedGames);

        const groupsRef = collection(db, "users", user.uid, "groups");
        const groupsSnap = await getDocs(groupsRef);

        let userGroups = groupsSnap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: safeText(data.name, "Untitled Group") || "Untitled Group",
            gameIds: Array.isArray(data.gameIds)
              ? data.gameIds.map((id) => String(id))
              : [],
            field: data.field || "platform",
            operator: data.operator || "eq",
            value: data.value || "",
          };
        });

        userGroups = userGroups.sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""), undefined, {
            sensitivity: "base",
          })
        );

        const fullFilters = [
          ALL_PLATFORMS_FILTER,
          UNGROUPED_FILTER,
          ...userGroups,
        ];
        setCustomFilters(fullFilters);

        let initialGroups = ["all-platforms"];

        if (typeof window !== "undefined") {
          const storageKey = `vgdb_lastGroupIds_${user.uid}`;
          const storedRaw = window.localStorage.getItem(storageKey);

          if (storedRaw) {
            try {
              const parsed = JSON.parse(storedRaw);
              let candidateIds = [];

              if (Array.isArray(parsed)) candidateIds = parsed;
              else if (typeof parsed === "string") candidateIds = [parsed];

              const validIds = candidateIds.filter((id) => {
                if (id === "all-platforms") return true;
                if (id === "ungrouped") return true;
                return userGroups.some((g) => g.id === id);
              });

              if (validIds.length > 0) initialGroups = validIds;
            } catch {
              // ignore
            }
          }
        }

        setActiveGroupIds(initialGroups);
        setCurrentPage(1);
        setIsPageDropdownOpen(false);
      } catch (err) {
        console.error("Error loading library or groups:", err);
      } finally {
        setLoadingStats(false);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===========================================================================
    DERIVED VALUES: GROUP SELECTION + FILTERED LISTS + PAGINATION
  =========================================================================== */
  const { total, completed } = stats;

  const safeActiveGroupIds = Array.isArray(activeGroupIds)
    ? activeGroupIds
    : ["all-platforms"];

  const onlyUngroupedSelected =
    safeActiveGroupIds.length === 1 && safeActiveGroupIds[0] === "ungrouped";

  const realSelectedGroupIds = safeActiveGroupIds.filter(
    (id) => id !== "all-platforms" && id !== "ungrouped"
  );

  let groupFilteredGames = libraryGames;

  if (onlyUngroupedSelected) {
    const groupedIdSet = new Set();

    customFilters.forEach((g) => {
      if (g.id === "all-platforms" || g.id === "ungrouped") return;
      if (Array.isArray(g.gameIds)) {
        g.gameIds.forEach((id) => groupedIdSet.add(String(id)));
      }
    });

    groupFilteredGames = libraryGames.filter(
      (game) => !groupedIdSet.has(String(game.id))
    );
  } else if (realSelectedGroupIds.length > 0) {
    const selectedGroups = customFilters.filter((g) =>
      realSelectedGroupIds.includes(g.id)
    );

    const gameIdSet = new Set();
    selectedGroups.forEach((g) => {
      if (Array.isArray(g.gameIds)) {
        g.gameIds.forEach((id) => gameIdSet.add(String(id)));
      }
    });

    groupFilteredGames = libraryGames.filter((game) =>
      gameIdSet.has(String(game.id))
    );
  }

  const groupStats = groupFilteredGames.reduce(
    (acc, game) => {
      acc.total += 1;
      const status = game.status?.toLowerCase?.() || "";
      if (status === "completed") acc.completed += 1;
      else if (status === "backlog") acc.backlog += 1;
      else if (status === "playing") acc.playing += 1;
      return acc;
    },
    { total: 0, completed: 0, backlog: 0, playing: 0 }
  );

  let filteredGames = groupFilteredGames;
  if (statusFilter !== "all") {
    filteredGames = filteredGames.filter((game) => {
      const status = game.status?.toLowerCase?.() || "";
      if (statusFilter === "backlog") return status === "backlog";
      if (statusFilter === "completed") return status === "completed";
      return true;
    });
  }

  const totalPages =
    filteredGames.length === 0
      ? 1
      : Math.ceil(filteredGames.length / ITEMS_PER_PAGE);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageGames = filteredGames.slice(startIndex, endIndex);

  // ✅ Scan Import: "Found" count (how many SELECTED candidates returned at least 1 match)
  const scanFoundCount = candidates.reduce((acc, c) => {
    if (!selectedCandidateIds.has(c.id)) return acc;
    const m = candidateMatches?.[c.id];
    const hasMatch = Array.isArray(m?.results) && m.results.length > 0;
    return hasMatch ? acc + 1 : acc;
  }, 0);

  /* ===========================================================================
    GROUP BUILDER: CREATE / UPDATE GROUP
  =========================================================================== */
  async function handleCreateFilter(e) {
    e.preventDefault();

    if (!filterName.trim()) {
      alert("Please give your group a name.");
      return;
    }

    if (!authUser) {
      alert("You must be signed in to save groups.");
      return;
    }

    const newFilter = {
      name: filterName.trim(),
      field,
      operator,
      value: value.trim(),
      gameIds: (selectedGroupGameIds || []).map((id) => String(id)),
    };

    try {
      if (editingGroupId) {
        const groupDocRef = doc(db, "users", authUser.uid, "groups", editingGroupId);
        await setDoc(groupDocRef, newFilter, { merge: false });

        setCustomFilters((prev) => {
          const permanent = prev.filter(
            (g) => g.id === "all-platforms" || g.id === "ungrouped"
          );
          const rest = prev.filter(
            (g) => g.id !== "all-platforms" && g.id !== "ungrouped"
          );

          const updatedRest = rest
            .map((g) => (g.id === editingGroupId ? { id: editingGroupId, ...newFilter } : g))
            .sort((a, b) =>
              String(a.name || "").localeCompare(String(b.name || ""), undefined, {
                sensitivity: "base",
              })
            );

          return [...permanent, ...updatedRest];
        });

        setActiveGroups((prev) => {
          const arr = Array.isArray(prev) ? prev : ["all-platforms"];
          const nonPermanent = arr.filter((id) => id !== "all-platforms" && id !== "ungrouped");
          const merged = Array.from(new Set([...nonPermanent, editingGroupId]));
          return merged.length > 0 ? merged : ["all-platforms"];
        });
      } else {
        const groupsRef = collection(db, "users", authUser.uid, "groups");
        const docRef = await addDoc(groupsRef, newFilter);

        const savedFilter = { id: docRef.id, ...newFilter };

        setCustomFilters((prev) => {
          const permanent = prev.filter(
            (g) => g.id === "all-platforms" || g.id === "ungrouped"
          );
          const rest = prev.filter(
            (g) => g.id !== "all-platforms" && g.id !== "ungrouped"
          );

          const updatedRest = [...rest, savedFilter].sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || ""), undefined, {
              sensitivity: "base",
            })
          );

          return [...permanent, ...updatedRest];
        });

        setActiveGroups([docRef.id]);
      }

      setFilterName("");
      setValue("");
      setField("platform");
      setOperator("eq");
      setSelectedGroupGameIds([]);
      setShowGameSelection(false);
      setEditingGroupId(null);

      setCurrentPage(1);
      setIsPageDropdownOpen(false);

      closeCustomFilterPanel();
    } catch (err) {
      console.error("Error saving group:", err);
      alert("There was a problem saving this group. Please try again.");
    }
  }

  async function handleDeleteGroup() {
    if (!editingGroupId) return;

    if (!authUser) {
      alert("You must be signed in to delete groups.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this group?");
    if (!confirmed) return;

    try {
      const groupDocRef = doc(db, "users", authUser.uid, "groups", editingGroupId);
      await deleteDoc(groupDocRef);

      setCustomFilters((prev) => prev.filter((g) => g.id !== editingGroupId));

      setActiveGroups((prev) => {
        const arr = Array.isArray(prev) ? prev : ["all-platforms"];
        const remaining = arr.filter((id) => id !== editingGroupId);

        const nonPermanent = remaining.filter(
          (id) => id !== "all-platforms" && id !== "ungrouped"
        );

        return nonPermanent.length > 0 ? remaining : ["all-platforms"];
      });

      setFilterName("");
      setValue("");
      setField("platform");
      setOperator("eq");
      setSelectedGroupGameIds([]);
      setShowGameSelection(false);
      setEditingGroupId(null);

      setCurrentPage(1);
      setIsPageDropdownOpen(false);

      closeCustomFilterPanel();
    } catch (err) {
      console.error("Error deleting group:", err);
      alert("There was a problem deleting this group. Please try again.");
    }
  }

  /* ===========================================================================
    MODAL: OPEN/CLOSE + MODE SWITCHING
  =========================================================================== */
  function openCustomFilterPanel() {
    const panel = document.querySelector(".custom-filter-settings-con");
    if (panel) {
      panel.style.pointerEvents = "auto";
      panel.style.opacity = "1";
    }
  }

  function openImportPanel() {
    setPanelMode("import");
    setEditingGroupId(null);
    setShowGameSelection(false);
    openCustomFilterPanel();
  }

  function openNewGroupPanel() {
    setPanelMode("group");
    setEditingGroupId(null);
    setFilterName("");
    setField("platform");
    setOperator("eq");
    setValue("");
    setSelectedGroupGameIds([]);
    setShowGameSelection(false);
    openCustomFilterPanel();
  }

  function closeCustomFilterPanel() {
    const panel = document.querySelector(".custom-filter-settings-con");
    if (panel) {
      panel.style.pointerEvents = "none";
      panel.style.opacity = "0";
    }

    setPanelMode("group");
    setFilterName("");
    setValue("");
    setField("platform");
    setOperator("eq");
    setSelectedGroupGameIds([]);
    setShowGameSelection(false);
    setEditingGroupId(null);

    setScanError("");
    setScanText("");
    setScanCleanText("");
    setScanLoading(false);
    setCandidates([]);
    setSelectedCandidateIds(new Set());
    setCandidateMatches({});

    setScanPreviewUrls((prev) => {
      try {
        prev.forEach((u) => URL.revokeObjectURL(u));
      } catch {
        // ignore
      }
      return [];
    });
  }

  /* ===========================================================================
    GROUP PANEL: GAME SELECTION UI HELPERS
  =========================================================================== */
  function toggleGameSelection() {
    setShowGameSelection((prev) => !prev);
  }

  function toggleGameInGroup(gameId) {
    const id = String(gameId);
    setSelectedGroupGameIds((prev) => {
      const arr = Array.isArray(prev) ? prev.map(String) : [];
      if (arr.includes(id)) return arr.filter((x) => x !== id);
      return [...arr, id];
    });
  }

  function openGroupModalForGroup(groupId, extraGameId) {
    setPanelMode("group");

    const activeGroup =
      groupId && groupId !== "all-platforms" && groupId !== "ungrouped"
        ? customFilters.find((g) => g.id === groupId)
        : null;

    let baseIds = [];
    if (activeGroup && Array.isArray(activeGroup.gameIds)) {
      baseIds = activeGroup.gameIds.map(String);
    }

    const baseName = activeGroup?.name || "";
    const baseField = activeGroup?.field || "platform";
    const baseOperator = activeGroup?.operator || "eq";
    const baseValue = activeGroup?.value || "";

    if (extraGameId && !baseIds.includes(String(extraGameId))) {
      baseIds = [...baseIds, String(extraGameId)];
    }

    setFilterName(baseName);
    setField(baseField);
    setOperator(baseOperator);
    setValue(baseValue);
    setSelectedGroupGameIds(baseIds);
    setShowGameSelection(true);
    setEditingGroupId(activeGroup ? activeGroup.id : null);

    openCustomFilterPanel();
  }

  function handleHeaderAddToGroup() {
    if (realSelectedGroupIds.length !== 1) return;
    openGroupModalForGroup(realSelectedGroupIds[0]);
  }

  function handleAddToGroupFromGame(gameId) {
    if (realSelectedGroupIds.length === 0) {
      alert("Select a group first to add games to it.");
      return;
    }
    if (realSelectedGroupIds.length > 1) {
      alert("Select only one group when adding games via the + button.");
      return;
    }
    openGroupModalForGroup(realSelectedGroupIds[0], String(gameId));
  }

  /* ===========================================================================
    RENDER
  =========================================================================== */
  return (
    <main className="library-page">
      <Header />

      {/* ===========================
          HEADER CARD
      ============================ */}
      <section className="library-header-card">
        <div className="library-header-main">
          <div className="library-kicker">
            <span className="library-kicker-dot"></span>
            <span>Your Library</span>
          </div>
          <h1>All your games in one place.</h1>
          <p>
            Track what you’re playing, what you’ve finished, and what’s still
            living in the backlog. Filter by status, platform, or genre to
            decide what to play next.
          </p>

          <div className="library-header-actions">
            <Link to="/search" className="btn btn-primary">
              Search For Game
            </Link>

            <a href="#filter-settings">
              <button className="btn btn-ghost" type="button" onClick={openImportPanel}>
                Import Games To Library
              </button>
            </a>
          </div>
        </div>

        <div className="library-header-meta">
          <div className="library-stat total-game-stat">
            <div className="library-stat-label">Total games</div>
            <div className="library-stat-value">{loadingStats ? "…" : total}</div>
            <div className="library-stat-sub">
              {loadingStats ? "Loading…" : `${completed} completed`}
            </div>
          </div>
        </div>
      </section>

      {/* ===========================
          FILTERS (STATUS + GROUPS)
      ============================ */}
      <section>
        <div className="library-filters">
          <div>
            <button
              className={`filter-pill ${statusFilter === "all" ? "is-active" : ""}`}
              onClick={() => handleStatusFilterChange("all")}
            >
              <span>All</span>
              <span className="filter-count">{loadingStats ? "…" : groupStats.total}</span>
            </button>

            <button
              className={`filter-pill ${
                statusFilter === "backlog" ? "is-active" : ""
              }`}
              onClick={() => handleStatusFilterChange("backlog")}
            >
              <span>Backlog</span>
              <span className="filter-count">{loadingStats ? "…" : groupStats.backlog}</span>
            </button>

            <button
              className={`filter-pill ${
                statusFilter === "completed" ? "is-active" : ""
              }`}
              onClick={() => handleStatusFilterChange("completed")}
            >
              <span>Completed</span>
              <span className="filter-count">{loadingStats ? "…" : groupStats.completed}</span>
            </button>
          </div>

          <a href="#filter-settings">
            <button className="btn btn-primary" onClick={openNewGroupPanel}>
              Create New Group
            </button>
          </a>
        </div>

        <div className="custom-filters-con">
          <h3>Your Groups</h3>
          <div className="custom-filters">
            {customFilters.map((f) => (
              <button
                key={f.id}
                className={`filter-pill ${
                  safeActiveGroupIds.includes(f.id) ? "is-active" : ""
                }`}
                onClick={() => handleToggleGroup(f.id)}
              >
                {safeText(f.name, "Group")}
              </button>
            ))}

            {realSelectedGroupIds.length === 1 && (
              <button
                type="button"
                className="add-to-group btn btn-primary"
                onClick={handleHeaderAddToGroup}
              >
                Manage Group
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ===========================
          MAIN LIBRARY GRID
      ============================ */}
      <section className="library-grid">
        <div className="game-grid">
          {loadingStats ? (
            <p>Loading your library…</p>
          ) : pageGames.length === 0 ? (
            <p>No games match this filter yet.</p>
          ) : (
            pageGames.map((game) => {
              const imageUrl =
                safeText(game.backgroundImage) ||
                safeText(game.background_image) ||
                safeText(game.coverImage) ||
                safeText(game.image) ||
                "";

              const primaryGenre = getPrimaryGenreFromGame(game);

              const metacriticScore =
                game.metacritic ?? game.metacriticScore ?? game.metaScore ?? null;

              const hasScore = metacriticScore !== null && metacriticScore !== undefined;

              const groupTags = Array.from(
                new Set(
                  customFilters
                    .filter(
                      (g) =>
                        g.id !== "all-platforms" &&
                        g.id !== "ungrouped" &&
                        Array.isArray(g.gameIds) &&
                        g.gameIds.some((id) => String(id) === String(game.id))
                    )
                    .map((g) => safeText(g.name, ""))
                    .filter(Boolean)
                )
              ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

              const gameHash = game.rawgId || game.slug || game.id;

              return (
                <div className="game-wrapper" key={String(game.id)}>
                  <Link className="game-link" to={`/game#${gameHash}`}>
                    <div className="game-card">
                      <div
                        className="game-img"
                        style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : {}}
                      ></div>

                      <div className="game-info">
                        <p className="game-title">{safeText(game.title, "Untitled game")}</p>
                        <div className="game-sub-info">
                          {primaryGenre && <p className="game-genre">{primaryGenre}</p>}
                          <p className="game-meta">
                            {hasScore ? `${metacriticScore} Metacritic` : "Unrated"}
                          </p>
                        </div>
                      </div>

                      {groupTags.length > 0 && (
                        <div className="game-group-tags">
                          {groupTags.map((name) => (
                            <span key={`${game.id}-${name}`} className="game-group-tag">
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="add-button-con">
                    <button
                      className="add-button"
                      type="button"
                      onClick={() => handleAddToGroupFromGame(game.id)}
                    >
                      <img src={plusIcon} alt="Add to group" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!loadingStats && filteredGames.length > 0 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={safeCurrentPage === 1}
              onClick={() => {
                setCurrentPage((prev) => Math.max(1, prev - 1));
                setIsPageDropdownOpen(false);
              }}
            >
              ‹ Prev
            </button>

            <div className={`dropdown ${isPageDropdownOpen ? "open" : ""}`}>
              <button
                className="dropdown-trigger"
                type="button"
                onClick={() => setIsPageDropdownOpen((prev) => !prev)}
              >
                Page {safeCurrentPage} of {totalPages} ▾
              </button>

              {isPageDropdownOpen && (
                <div className="dropdown-menu">
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                    const pageNumber = i + 1;
                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`dropdown-item ${
                          pageNumber === safeCurrentPage ? "current-page" : ""
                        }`}
                        onClick={() => {
                          setCurrentPage(pageNumber);
                          setIsPageDropdownOpen(false);
                        }}
                      >
                        Page {pageNumber}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              className="page-btn"
              disabled={safeCurrentPage === totalPages}
              onClick={() => {
                setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                setIsPageDropdownOpen(false);
              }}
            >
              Next ›
            </button>
          </div>
        )}
      </section>

      {/* ===========================
          GROUP / IMPORT MODAL
      ============================ */}
      <section className="custom-filter-settings-con">
        <div id="filter-settings" className="custom-filter-settings">
          <h2>
            {panelMode === "import"
              ? "Select Import Method"
              : editingGroupId
              ? "Edit Group"
              : "Create Custom Group"}
          </h2>

          {/* ===========================
              GROUP MODE
          ============================ */}
          {panelMode === "group" && (
            <form onSubmit={handleCreateFilter} className="cfs-form">
              <label className="cfs-field filter-name">
                <span className="cfs-label">Group name</span>
                <input
                  type="text"
                  placeholder="e.g. Co-op backlog, Short RPGs, Xbox 360"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </label>

              <div className="game-selection-con">
                <div className="game-selection-toggle" onClick={toggleGameSelection}>
                  <div className="game-selection-count">
                    <p>Game Selection</p>
                    <span>{selectedGroupGameIds.length}</span>
                  </div>

                  <img
                    className={`toggle-icon ${showGameSelection ? "active" : ""}`}
                    src={downChevron}
                    alt="Toggle game selection"
                  />
                </div>

                {showGameSelection && (
                  <div className="game-selection-list">
                    {libraryGames.length === 0 ? (
                      <p>No games found.</p>
                    ) : (
                      libraryGames.map((game) => {
                        const checked = selectedGroupGameIds
                          .map(String)
                          .includes(String(game.id));

                        return (
                          <div
                            key={String(game.id)}
                            className={`filter-game${checked ? " selected-game" : ""}`}
                            onClick={() => toggleGameInGroup(game.id)}
                          >
                            <p>{safeText(game.title, "Untitled game")}</p>
                            <input
                              type="checkbox"
                              checked={checked}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleGameInGroup(game.id)}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="cfs-actions">
                {editingGroupId && (
                  <button
                    type="button"
                    className="btn btn-primary delete-group-btn"
                    onClick={handleDeleteGroup}
                  >
                    Delete Group
                  </button>
                )}
                <button type="submit" className="btn btn-primary">
                  {editingGroupId ? "Save Changes" : "Save Group"}
                </button>
              </div>
            </form>
          )}

          {/* ===========================
              IMPORT MODE
          ============================ */}
          {panelMode === "import" && (
            <div className="import-settings">
              <input
                ref={scanFileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handleScanFileChange}
              />

              <div>
                <p>Scan Images For Game Names</p>

                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={openScanFilePicker}
                  disabled={scanLoading}
                >
                  {scanLoading ? "Scanning..." : "Upload"}
                </button>

                {scanPreviewUrls.length > 0 && (
                  <div className="game-images-con" style={{ marginTop: "10px" }}>
                    {scanPreviewUrls.map((src, idx) => (
                      <div className="game-image" key={`${src}-${idx}`}>
                        <img src={src} alt={`Scan ${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                )}

                {scanError && <p style={{ marginTop: "10px" }}>❌ {scanError}</p>}

                {/* ✅ Only show results AFTER LLM finishes */}
                {!scanLoading && scanCleanText && (
                  <div style={{ marginTop: "12px" }}>
                    <p style={{ marginBottom: "6px" }}>
                      Detected games (A–Z) — editable:
                    </p>

                    <textarea
                      value={scanCleanText}
                      onChange={(e) => setScanCleanText(e.target.value)}
                      rows={10}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        padding: "10px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(0,0,0,0.25)",
                        color: "white",
                      }}
                      placeholder="Detected games will appear here..."
                    />

                    {/* ✅ Candidates (A–Z) with checkbox + Match + Remove + Choose + Add */}
                    {candidates.length > 0 && (
                      <div style={{ marginTop: "14px" }}>
                        <p style={{ marginBottom: "8px" }}>
                          Candidates (A–Z) — edit + uncheck junk:
                          <span style={{ marginLeft: "10px", opacity: 0.9 }}>
                            Found: {scanFoundCount} / {selectedCandidateIds.size}
                          </span>
                        </p>

                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                            marginBottom: "10px",
                          }}
                        >
                          <button className="btn btn-ghost" type="button" onClick={selectAllCandidates}>
                            Select All
                          </button>
                          <button className="btn btn-ghost" type="button" onClick={deselectAllCandidates}>
                            Select None
                          </button>

                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={matchSelectedCandidates}
                            disabled={candidates.length === 0 || selectedCandidateIds.size === 0}
                          >
                            Match Selected
                          </button>

                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={importAllMatchedSelected}
                            disabled={candidates.length === 0 || selectedCandidateIds.size === 0}
                          >
                            Import Matched
                          </button>
                        </div>

                        <div className="scanned-text-grid" style={{ display: "grid", gap: "8px" }}>
                          {candidates.map((c) => {
                            const checked = selectedCandidateIds.has(c.id);
                            const match = candidateMatches[c.id];

                            return (
                              <div
                                key={c.id}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                  padding: "10px",
                                  borderRadius: "10px",
                                  background: "rgba(255,255,255,0.06)",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "10px",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleCandidate(c.id)}
                                  />

                                  <input
                                    value={c.cleaned}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setCandidates((prev) =>
                                        prev.map((x) => (x.id === c.id ? { ...x, cleaned: val } : x))
                                      );
                                    }}
                                    style={{
                                      flex: 1,
                                      minWidth: "220px",
                                      background: "rgba(0,0,0,0.25)",
                                      border: "1px solid rgba(255,255,255,0.15)",
                                      color: "white",
                                      padding: "8px 10px",
                                      borderRadius: "10px",
                                    }}
                                  />

                                  <button
                                    className="btn btn-primary"
                                    type="button"
                                    onClick={() => handleFindMatchForCandidate(c.id)}
                                    disabled={!checked || !c.cleaned.trim()}
                                  >
                                    {match?.loading ? "Matching..." : "Match"}
                                  </button>

                                  <button className="btn btn-ghost" type="button" onClick={() => removeCandidate(c.id)}>
                                    Remove
                                  </button>
                                </div>

                                {match?.error && <p style={{ margin: 0 }}>❌ {match.error}</p>}

                                {Array.isArray(match?.results) && match.results.length > 0 && (
                                  <div style={{ opacity: 0.95 }}>
                                    <p style={{ margin: "4px 0" }}>Top matches:</p>
                                    <ul style={{ margin: 0, paddingLeft: "18px" }}>
                                      {match.results.slice(0, 5).map((r, idx) => (
                                        <li key={`${c.id}-r-${idx}`}>
                                          {safeText(r?.name) || safeText(r?.title) || safeText(r?.slug) || "Result"}
                                        </li>
                                      ))}
                                    </ul>

                                    {/* Choose + Add to Library */}
                                    <div style={{ marginTop: "10px" }}>
                                      <p style={{ margin: "6px 0" }}>
                                        Choose match:
                                        <span style={{ marginLeft: "8px", opacity: 0.9 }}>
                                          {match?.chosen ? "✅ Selected" : "—"}
                                        </span>
                                      </p>

                                      <div style={{ display: "grid", gap: "6px" }}>
                                        {match.results.slice(0, 5).map((r, idx) => {
                                          const rid = getResultId(r) || `${c.id}_opt_${idx}`;
                                          const chosenId = getResultId(match?.chosen);
                                          const isChosen = chosenId && chosenId === getResultId(r);

                                          return (
                                            <label
                                              key={rid}
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                                padding: "8px",
                                                borderRadius: "10px",
                                                background: "rgba(0,0,0,0.22)",
                                                border: isChosen
                                                  ? "1px solid rgba(255,255,255,0.30)"
                                                  : "1px solid rgba(255,255,255,0.12)",
                                              }}
                                            >
                                              <input
                                                type="radio"
                                                name={`chosen_${c.id}`}
                                                checked={!!isChosen}
                                                onChange={() => chooseMatch(c.id, r)}
                                              />
                                              <span style={{ flex: 1 }}>
                                                {safeText(r?.name) || safeText(r?.title) || safeText(r?.slug) || "Result"}
                                              </span>
                                            </label>
                                          );
                                        })}
                                      </div>

                                      <div
                                        style={{
                                          marginTop: "10px",
                                          display: "flex",
                                          gap: "10px",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        <button
                                          className="btn btn-primary"
                                          type="button"
                                          onClick={() => {
                                            if (!match?.chosen && match.results[0]) {
                                              chooseMatch(c.id, match.results[0]);
                                            }
                                            addChosenMatchToLibrary(c.id);
                                          }}
                                          disabled={!authUser || !checked}
                                        >
                                          Add to Library
                                        </button>

                                        {!authUser && (
                                          <p style={{ margin: 0, opacity: 0.85 }}>Sign in to add games.</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p>Import Steam Library</p>
                <button className="btn btn-primary" type="button" onClick={handleSteamSync}>
                  Sync Steam Library
                </button>
              </div>
            </div>
          )}

          <button className="close-button" onClick={closeCustomFilterPanel}>
            <span>X</span>
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}

// YourLibrary.jsx  (FULL FILE)
// ✅ FIXED for new backend:
// - /api/steam/owned-games now sends the required "x-firebase-uid" header
// - still uses credentials: "include" so the Steam session cookie is sent

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import downChevron from "../assets/images/down_chevron.png";
import plusIcon from "../assets/images/plus-icon.png";
import loadingIcon from "../assets/images/loading.gif";

import { auth, onAuthStateChanged } from "../firebase/fireAuth";
import { collection, getDocs, db } from "../firebase/firestore";

import {
  addGameIdsToGroupFirestore,
  createGroupInFirestore,
  updateGroupInFirestore,
  deleteGroupFromFirestore,
} from "../services/yourLibrary/groupService";
import {
  scanImageForText,
  extractGameTitlesWithLLM,
} from "../services/yourLibrary/scanService";
import {
  checkSteamSession,
  fetchSteamOwnedGameTitles,
  logoutSteamSession,
} from "../services/yourLibrary/steamService";
import {
  searchGameByTitle,
  saveGameToLibraryFirestore,
} from "../services/yourLibrary/gameSearchService";

import "../styles/yourLibrary.css";

import {
  safeText,
  compareByTitle,
  compareByMetacritic,
  getSortLabel,
} from "../utils/yourLibrary/sortHelpers";
import {
  isGameInGroup,
  isGameUngrouped,
} from "../utils/yourLibrary/groupFilterHelpers";
import {
  readLibraryViewState,
  writeLibraryViewState,
} from "../utils/yourLibrary/viewStatePersistence";
import { getPrimaryGenreFromGame } from "../utils/yourLibrary/gameDataHelpers";
import {
  getResultId,
  normalizeResultToLibraryDoc,
  pickBestResult,
  titlesToCandidates,
  parseTitlesFromTextarea,
} from "../utils/yourLibrary/importHelpers";
import {
  steamAuthUrl,
  stripSteamQueryParam,
} from "../utils/yourLibrary/steamUtils";

/* =============================================================================
  CONFIG
============================================================================= */
const ITEMS_PER_PAGE = 12;

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
    ✅ SORTING
  =========================================================================== */
  const [sortBy, setSortBy] = useState("name_asc"); // name_asc | name_desc | meta_desc | meta_asc

  /* ===========================================================================
    STATE: PAGINATION
  =========================================================================== */
  const [currentPage, setCurrentPage] = useState(1);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);

  /* ===========================================================================
    STATE: GROUP BUILDER (MODAL -> group mode)
  =========================================================================== */
  const [panelMode, setPanelMode] = useState("group"); // "group" | "import" | "text"
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

  // final cleaned alphabetical list (one title per line) (re-used for Steam too)
  const [scanCleanText, setScanCleanText] = useState("");

  const [scanPreviewUrls, setScanPreviewUrls] = useState([]);

  const [candidates, setCandidates] = useState([]); // [{ id, raw, cleaned }]
  const [selectedCandidateIds, setSelectedCandidateIds] = useState(new Set());

  // import status per candidate (for UI feedback)
  const [candidateImportStatus, setCandidateImportStatus] = useState({});
  // { [candidateId]: { state: "idle" | "importing" | "imported" | "skipped" | "notfound" | "error", message?: string } }

  const [notFoundCandidates, setNotFoundCandidates] = useState([]); // [{ id, title }]
  const [importSummary, setImportSummary] = useState({
    imported: 0,
    notFound: 0,
    skipped: 0,
  });

  // choose group to add imported games to
  const [importTargetGroupId, setImportTargetGroupId] = useState("none");

  // Steam titles (optional)
  const [steamTitles, setSteamTitles] = useState([]);

  // ✅ prevents infinite auto-sync loop after redirect
  const hasAutoSyncedRef = useRef(false);

  // ✅ Steam session state (Option B)
  // null = unknown (still checking), true/false = known
  const [steamLinked, setSteamLinked] = useState(null);
  const [steamCheckLoading, setSteamCheckLoading] = useState(false);

  // ✅ Restore library search bar + functionality
  const [searchTerm, setSearchTerm] = useState("");

  /* ===========================================================================
    CONSTANTS: PERMANENT GROUPS + GROUP LIST
  =========================================================================== */
  const ALL_PLATFORMS_FILTER = {
    id: "all-platforms",
    name: "All Games",
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

  function openTextImportPanel() {
    setPanelMode("text");
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

    setCandidateImportStatus({});
    setNotFoundCandidates([]);
    setImportSummary({ imported: 0, notFound: 0, skipped: 0 });
    setImportTargetGroupId("none");

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
    SCAN IMPORT: OPEN PICKER
  =========================================================================== */
  function openScanFilePicker() {
    setScanError("");
    setScanText("");
    setScanCleanText("");
    setCandidates([]);
    setSelectedCandidateIds(new Set());

    setCandidateImportStatus({});
    setNotFoundCandidates([]);
    setImportSummary({ imported: 0, notFound: 0, skipped: 0 });
    setImportTargetGroupId("none");

    if (scanFileInputRef.current) scanFileInputRef.current.click();
  }

  /* ===========================================================================
    SCAN/STEAM IMPORT: CANDIDATE CONTROLS
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

    setCandidateImportStatus((prev) => {
      if (!prev || !prev[candidateId]) return prev;
      const next = { ...prev };
      delete next[candidateId];
      return next;
    });

    setNotFoundCandidates((prev) => prev.filter((x) => x.id !== candidateId));
  }

  async function addGameIdsToGroup(groupId, gameIds) {
    if (!authUser) return;
    if (!groupId || groupId === "none") return;
    if (!Array.isArray(gameIds) || gameIds.length === 0) return;

    await addGameIdsToGroupFirestore(authUser.uid, groupId, gameIds);

    setCustomFilters((prev) =>
      (prev || []).map((g) => {
        if (g.id !== groupId) return g;
        const existing = Array.isArray(g.gameIds) ? g.gameIds.map(String) : [];
        const merged = Array.from(
          new Set([...existing, ...gameIds.map(String)]),
        );
        return { ...g, gameIds: merged };
      }),
    );
  }

  /* ===========================================================================
    ✅ FIXED: Import behavior is group-aware (NOT library-wide)
  =========================================================================== */
  async function importSelectedCandidatesDirect() {
    if (!authUser) {
      alert("You must be signed in to import games.");
      return;
    }

    const selected = candidates.filter((c) => selectedCandidateIds.has(c.id));
    if (selected.length === 0) return;

    setNotFoundCandidates([]);
    setImportSummary({ imported: 0, notFound: 0, skipped: 0 });

    setCandidateImportStatus((prev) => {
      const next = { ...(prev || {}) };
      selected.forEach((c) => {
        next[c.id] = { state: "idle" };
      });
      return next;
    });

    let importedCount = 0;
    let skippedCount = 0;
    const notFound = [];
    const toAddToGroupIds = [];

    for (const c of selected) {
      const q = String(c.cleaned || "").trim();
      if (!q) continue;

      setCandidateImportStatus((prev) => ({
        ...(prev || {}),
        [c.id]: { state: "importing" },
      }));

      try {
        // eslint-disable-next-line no-await-in-loop
        const results = await searchGameByTitle(q);
        if (results.length === 0) {
          notFound.push({ id: c.id, title: q });
          setCandidateImportStatus((prev) => ({
            ...(prev || {}),
            [c.id]: { state: "notfound" },
          }));
          continue;
        }

        const chosen = pickBestResult(results, q);
        if (!chosen) {
          notFound.push({ id: c.id, title: q });
          setCandidateImportStatus((prev) => ({
            ...(prev || {}),
            [c.id]: { state: "notfound" },
          }));
          continue;
        }

        const resultId = getResultId(chosen);
        if (!resultId) {
          notFound.push({ id: c.id, title: q });
          setCandidateImportStatus((prev) => ({
            ...(prev || {}),
            [c.id]: { state: "notfound" },
          }));
          continue;
        }

        const docIdStr = String(resultId);

        const existsInLocalLibrary = (libraryGames || []).some(
          (g) => String(g.id) === docIdStr,
        );

        const targetIsNone = importTargetGroupId === "none";
        const targetGroupId = targetIsNone ? null : importTargetGroupId;

        let alreadyInTarget = false;

        if (targetIsNone) {
          alreadyInTarget =
            existsInLocalLibrary && isGameUngrouped(customFilters, docIdStr);
        } else if (targetGroupId) {
          alreadyInTarget = isGameInGroup(
            customFilters,
            targetGroupId,
            docIdStr,
          );
        }

        if (alreadyInTarget) {
          skippedCount += 1;
          setCandidateImportStatus((prev) => ({
            ...(prev || {}),
            [c.id]: {
              state: "skipped",
              message: targetIsNone
                ? "Already ungrouped"
                : "Already in selected group",
            },
          }));
          continue;
        }

        if (importTargetGroupId !== "none") {
          toAddToGroupIds.push(docIdStr);
        }

        if (!existsInLocalLibrary) {
          const payload = normalizeResultToLibraryDoc(chosen);

          // eslint-disable-next-line no-await-in-loop
          await saveGameToLibraryFirestore(authUser.uid, docIdStr, payload);

          setLibraryGames((prev) => {
            const exists = (prev || []).some((g) => String(g.id) === docIdStr);
            if (exists) return prev;

            const next = [{ id: docIdStr, ...payload }, ...(prev || [])];
            return next.sort((a, b) =>
              String(a.title || "").localeCompare(
                String(b.title || ""),
                undefined,
                {
                  sensitivity: "base",
                },
              ),
            );
          });

          importedCount += 1;

          setCandidateImportStatus((prev) => ({
            ...(prev || {}),
            [c.id]: { state: "imported" },
          }));
        } else {
          setCandidateImportStatus((prev) => ({
            ...(prev || {}),
            [c.id]: {
              state: "imported",
              message:
                importTargetGroupId === "none"
                  ? "Already in library (but not ungrouped)"
                  : "Already in library — will add to group",
            },
          }));
        }
      } catch (e) {
        const msg = e?.message || "Import failed";
        setCandidateImportStatus((prev) => ({
          ...(prev || {}),
          [c.id]: { state: "error", message: msg },
        }));
      }
    }

    if (importTargetGroupId !== "none" && toAddToGroupIds.length > 0) {
      try {
        const uniq = Array.from(new Set(toAddToGroupIds.map(String)));
        await addGameIdsToGroup(importTargetGroupId, uniq);
      } catch (e) {
        console.error("Failed adding imports to group:", e);
      }
    }

    setNotFoundCandidates(notFound);
    setImportSummary({
      imported: importedCount,
      notFound: notFound.length,
      skipped: skippedCount,
    });
  }

  /* ===========================================================================
    STEAM/SCAN SHARED: TITLES -> CANDIDATES
  =========================================================================== */
  function handleRegenerateCandidatesFromTextarea() {
    const titles = parseTitlesFromTextarea(scanCleanText);

    setCandidateImportStatus({});
    setNotFoundCandidates([]);
    setImportSummary({ imported: 0, notFound: 0, skipped: 0 });

    if (titles.length === 0) {
      setCandidates([]);
      setSelectedCandidateIds(new Set());
      return;
    }

    const { sortedTitles, nextCandidates } = titlesToCandidates(
      titles,
      "manual",
    );

    setScanCleanText(sortedTitles.join("\n"));

    setCandidates(nextCandidates);
    setSelectedCandidateIds(new Set(nextCandidates.map((c) => c.id)));
  }

  /* ===========================================================================
    SCAN IMPORT: AI CLEANUP (SERVER ROUTE)
  =========================================================================== */
  /* ===========================================================================
    SCAN IMPORT: UPLOAD FLOW (MULTI-IMAGE OCR -> COMBINE -> LLM -> THEN SHOW)
  =========================================================================== */
  async function handleScanFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    e.target.value = "";

    setScanLoading(true);
    setScanError("");

    setScanText("");
    setScanCleanText("");
    setCandidates([]);
    setSelectedCandidateIds(new Set());

    setCandidateImportStatus({});
    setNotFoundCandidates([]);
    setImportSummary({ imported: 0, notFound: 0, skipped: 0 });
    setImportTargetGroupId("none");

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
        // eslint-disable-next-line no-await-in-loop
        const raw = await scanImageForText(file);
        results.push(raw);
      }

      const combined = results.filter(Boolean).join("\n\n---\n\n");
      setScanText(combined);

      const { sortedTitles, nextCandidates } =
        await extractGameTitlesWithLLM(combined);

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
    STEAM: CHECK SESSION (Option B)
  =========================================================================== */
  async function refreshSteamLinkedState() {
    try {
      setSteamCheckLoading(true);
      const { linked } = await checkSteamSession();
      setSteamLinked(linked);
      return linked;
    } catch (e) {
      console.warn("Steam session check failed:", e);
      setSteamLinked(false);
      return false;
    } finally {
      setSteamCheckLoading(false);
    }
  }

  useEffect(() => {
    if (!authUser?.uid) {
      setSteamLinked(null);
      return;
    }
    refreshSteamLinkedState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid]);

  /* ===========================================================================
    STEAM: LOGIN + SYNC (Option B session-only)
  =========================================================================== */
  function handleSteamLogin() {
    if (!authUser?.uid) {
      alert("Please sign in first.");
      return;
    }

    // ✅ backend requires ?uid=...
    window.location.href = steamAuthUrl(authUser.uid);
  }

  async function handleSteamSync({ allowAutoRelink = true } = {}) {
    try {
      if (!authUser?.uid) {
        alert("Please sign in first.");
        return;
      }

      const { linked: loggedIn, errorMsg: meError } = await checkSteamSession();
      console.log("✅ Steam /api/me:", { loggedIn });
      setSteamLinked(loggedIn);

      if (!loggedIn) {
        if (!allowAutoRelink) {
          setScanError(
            meError ||
              "Not linked to Steam in this browser. Click 'Link Steam' to connect your Steam account.",
          );
          return;
        }

        window.location.href = steamAuthUrl(authUser.uid);
        return;
      }

      let titles;
      try {
        titles = await fetchSteamOwnedGameTitles(authUser.uid);
        console.log("🎮 Steam owned-games fetched:", titles.length);
      } catch (gamesErr) {
        const errMsg = gamesErr?.message || "";
        if (allowAutoRelink && errMsg.toLowerCase().includes("not logged in with steam")) {
          window.location.href = steamAuthUrl(authUser.uid);
          return;
        }
        setScanError(errMsg || "Could not fetch Steam library.");
        return;
      }

      setSteamLinked(true);

      setSteamTitles(titles);

      setScanError("");
      setScanText("");
      setScanCleanText("");
      setCandidates([]);
      setSelectedCandidateIds(new Set());

      setCandidateImportStatus({});
      setNotFoundCandidates([]);
      setImportSummary({ imported: 0, notFound: 0, skipped: 0 });
      setImportTargetGroupId("none");

      const { sortedTitles, nextCandidates } = titlesToCandidates(
        titles,
        "steam",
      );

      setScanCleanText(sortedTitles.join("\n"));
      setCandidates(nextCandidates);
      setSelectedCandidateIds(new Set(nextCandidates.map((c) => c.id)));

      setPanelMode("import");
      openCustomFilterPanel();
    } catch (err) {
      console.error("🔥 Steam sync error:", err);
      setScanError(err?.message || "Steam sync failed.");
    }
  }

  /* ===========================================================================
    EFFECT: AUTO-RUN STEAM SYNC AFTER REDIRECT (?steam=linked)
  =========================================================================== */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const steamParam = params.get("steam");

    console.log(params);
    console.log(steamParam);

    if (steamParam === "linked" && authUser?.uid && !hasAutoSyncedRef.current) {
      hasAutoSyncedRef.current = true;

      stripSteamQueryParam();
      setSteamLinked(true);

      handleSteamSync({ allowAutoRelink: false });
    }

    if (steamParam === "fail") {
      stripSteamQueryParam();
      setSteamLinked(false);
      setScanError("Steam login failed. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid]);

  /* ===========================================================================
    EFFECT: AUTH LISTENER -> LOAD LIBRARY + GROUPS (RESTORES VIEW STATE)
  =========================================================================== */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);

      if (!user) {
        setStats({ total: 0, completed: 0, backlog: 0, playing: 0 });
        setLibraryGames([]);
        setCustomFilters([ALL_PLATFORMS_FILTER, UNGROUPED_FILTER]);
        setActiveGroupIds(["all-platforms"]);
        setStatusFilter("all");
        setCurrentPage(1);
        setSortBy("name_asc");
        setSearchTerm("");
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

        const sortedGamesByName = games.sort((a, b) =>
          String(a.title || "").localeCompare(
            String(b.title || ""),
            undefined,
            {
              sensitivity: "base",
            },
          ),
        );

        setStats({ total, completed, backlog, playing });
        setLibraryGames(sortedGamesByName);

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
          }),
        );

        const fullFilters = [
          ALL_PLATFORMS_FILTER,
          UNGROUPED_FILTER,
          ...userGroups,
        ];

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

        // ✅ RESTORE VIEW STATE (status + group + page + sort + search)
        let restoredGroups = initialGroups;
        let restoredStatus = "all";
        let restoredPage = 1;
        let restoredSortBy = "name_asc";
        let restoredSearchTerm = "";

        if (typeof window !== "undefined") {
          const saved = readLibraryViewState(user.uid);

          if (saved) {
            if (typeof saved.statusFilter === "string")
              restoredStatus = saved.statusFilter;

            if (Number.isFinite(Number(saved.currentPage))) {
              restoredPage = Math.max(1, Number(saved.currentPage));
            }

            if (
              typeof saved.sortBy === "string" &&
              ["name_asc", "name_desc", "meta_desc", "meta_asc"].includes(
                saved.sortBy,
              )
            ) {
              restoredSortBy = saved.sortBy;
            }

            if (typeof saved.searchTerm === "string") {
              restoredSearchTerm = saved.searchTerm;
            }

            const savedGroupsRaw = saved.activeGroupIds;
            const savedGroups = Array.isArray(savedGroupsRaw)
              ? savedGroupsRaw
              : typeof savedGroupsRaw === "string"
                ? [savedGroupsRaw]
                : [];

            if (savedGroups.length > 0) {
              const validIds = savedGroups.filter((id) => {
                if (id === "all-platforms") return true;
                if (id === "ungrouped") return true;
                return userGroups.some((g) => g.id === id);
              });

              if (validIds.length > 0) restoredGroups = validIds;
            }
          }
        }

        setCustomFilters(fullFilters);
        setStatusFilter(restoredStatus);
        setActiveGroupIds(restoredGroups);
        setCurrentPage(restoredPage);
        setSortBy(restoredSortBy);
        setSearchTerm(restoredSearchTerm);
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
    EFFECT: PERSIST VIEW STATE (status + group + page + sort + search)
  =========================================================================== */
  useEffect(() => {
    if (loadingStats) return;

    writeLibraryViewState(authUser?.uid, {
      statusFilter,
      currentPage,
      activeGroupIds,
      sortBy,
      searchTerm,
    });
  }, [
    authUser?.uid,
    statusFilter,
    currentPage,
    activeGroupIds,
    sortBy,
    searchTerm,
    loadingStats,
  ]);

  /* ===========================================================================
    DERIVED VALUES: GROUP SELECTION + FILTERED LISTS + SORT + PAGINATION
  =========================================================================== */
  const { total, completed } = stats;

  const safeActiveGroupIds = Array.isArray(activeGroupIds)
    ? activeGroupIds
    : ["all-platforms"];

  const onlyUngroupedSelected =
    safeActiveGroupIds.length === 1 && safeActiveGroupIds[0] === "ungrouped";

  const realSelectedGroupIds = safeActiveGroupIds.filter(
    (id) => id !== "all-platforms" && id !== "ungrouped",
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
      (game) => !groupedIdSet.has(String(game.id)),
    );
  } else if (realSelectedGroupIds.length > 0) {
    const selectedGroups = customFilters.filter((g) =>
      realSelectedGroupIds.includes(g.id),
    );

    const gameIdSet = new Set();
    selectedGroups.forEach((g) => {
      if (Array.isArray(g.gameIds)) {
        g.gameIds.forEach((id) => gameIdSet.add(String(id)));
      }
    });

    groupFilteredGames = libraryGames.filter((game) =>
      gameIdSet.has(String(game.id)),
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
    { total: 0, completed: 0, backlog: 0, playing: 0 },
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

  const qSearch = searchTerm.trim().toLowerCase();
  if (qSearch) {
    filteredGames = filteredGames.filter((game) => {
      const title = safeText(game.title, "").toLowerCase();
      return title.includes(qSearch);
    });
  }

  // ✅ APPLY SORT (before pagination)
  const sortedGames = [...filteredGames].sort((a, b) => {
    switch (sortBy) {
      case "name_desc":
        return compareByTitle(a, b, "desc");
      case "meta_desc":
        return compareByMetacritic(a, b, "desc");
      case "meta_asc":
        return compareByMetacritic(a, b, "asc");
      case "name_asc":
      default:
        return compareByTitle(a, b, "asc");
    }
  });

  const totalPages =
    sortedGames.length === 0
      ? 1
      : Math.ceil(sortedGames.length / ITEMS_PER_PAGE);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const MAX_DROPDOWN_PAGES = 10;

  let dropdownStartPage = safeCurrentPage - 4;
  let dropdownEndPage = safeCurrentPage + 5;

  // clamp to bounds
  if (dropdownStartPage < 1) {
    dropdownStartPage = 1;
    dropdownEndPage = Math.min(MAX_DROPDOWN_PAGES, totalPages);
  }

  if (dropdownEndPage > totalPages) {
    dropdownEndPage = totalPages;
    dropdownStartPage = Math.max(1, totalPages - MAX_DROPDOWN_PAGES + 1);
  }

  const dropdownPages = Array.from(
    { length: dropdownEndPage - dropdownStartPage + 1 },
    (_, i) => dropdownStartPage + i,
  );

  // ✅ paginate the sorted list (NOT the unsorted list)
  const pageGames = sortedGames.slice(startIndex, endIndex);

  const scanImportedCount = Object.values(candidateImportStatus || {}).reduce(
    (acc, v) => (v?.state === "imported" ? acc + 1 : acc),
    0,
  );

  const hasGeneratedCandidates = candidates.length > 0;

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
        await updateGroupInFirestore(authUser.uid, editingGroupId, newFilter);

        setCustomFilters((prev) => {
          const permanent = prev.filter(
            (g) => g.id === "all-platforms" || g.id === "ungrouped",
          );
          const rest = prev.filter(
            (g) => g.id !== "all-platforms" && g.id !== "ungrouped",
          );

          const updatedRest = rest
            .map((g) =>
              g.id === editingGroupId
                ? { id: editingGroupId, ...newFilter }
                : g,
            )
            .sort((a, b) =>
              String(a.name || "").localeCompare(
                String(b.name || ""),
                undefined,
                {
                  sensitivity: "base",
                },
              ),
            );

          return [...permanent, ...updatedRest];
        });

        setActiveGroups((prev) => {
          const arr = Array.isArray(prev) ? prev : ["all-platforms"];
          const nonPermanent = arr.filter(
            (id) => id !== "all-platforms" && id !== "ungrouped",
          );
          const merged = Array.from(new Set([...nonPermanent, editingGroupId]));
          return merged.length > 0 ? merged : ["all-platforms"];
        });
      } else {
        const savedFilter = await createGroupInFirestore(authUser.uid, newFilter);

        setCustomFilters((prev) => {
          const permanent = prev.filter(
            (g) => g.id === "all-platforms" || g.id === "ungrouped",
          );
          const rest = prev.filter(
            (g) => g.id !== "all-platforms" && g.id !== "ungrouped",
          );

          const updatedRest = [...rest, savedFilter].sort((a, b) =>
            String(a.name || "").localeCompare(
              String(b.name || ""),
              undefined,
              {
                sensitivity: "base",
              },
            ),
          );

          return [...permanent, ...updatedRest];
        });

        setActiveGroups([savedFilter.id]);
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

    const confirmed = window.confirm(
      "Are you sure you want to delete this group?",
    );
    if (!confirmed) return;

    try {
      await deleteGroupFromFirestore(authUser.uid, editingGroupId);

      setCustomFilters((prev) => prev.filter((g) => g.id !== editingGroupId));

      setActiveGroups((prev) => {
        const arr = Array.isArray(prev) ? prev : ["all-platforms"];
        const remaining = arr.filter((id) => id !== editingGroupId);

        const nonPermanent = remaining.filter(
          (id) => id !== "all-platforms" && id !== "ungrouped",
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
      alert("There was a problem deleting group. Please try again.");
    }
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

  function handleSortChange(nextSort) {
    setSortBy(nextSort);
    setCurrentPage(1);
    setIsPageDropdownOpen(false);
  }

  function revealSortingDrop(event) {
    event.stopPropagation();

    const sorting = event.currentTarget.parentNode;
    const menu = sorting.querySelector("div");

    if (!menu) return;

    menu.classList.toggle("invisible");
  }

  function handleSortingOptionClick(nextSort) {
    handleSortChange(nextSort);

    const sorting = document.querySelector(".sorting");
    const menu = sorting?.querySelector("div");

    if (menu) {
      menu.classList.add("invisible");
    }
  }

  /* ===========================================================================
    SHARED RENDER: CANDIDATE IMPORT UI
  =========================================================================== */
  function renderCandidateImportUI({
    title = "Game list (A–Z) — editable:",
    showTextarea = true,
    showRegenerateButton = true,
    showCandidatesHeading = true,
  } = {}) {
    if (!scanCleanText) return null;

    return (
      <div className="scan-results" style={{ marginTop: "12px" }}>
        <p className="scan-results-title" style={{ marginBottom: "6px" }}>
          {title}
        </p>

        {showTextarea && (
          <textarea
            className="scan-detected-text"
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
            placeholder="Paste or edit games here (one per line)..."
          />
        )}

        {showRegenerateButton && (
          <button
            style={{ marginTop: "10px" }}
            className="btn btn-primary"
            type="button"
            onClick={handleRegenerateCandidatesFromTextarea}
          >
            Regenerate Game Selection
          </button>
        )}

        {candidates.length > 0 && (
          <div className="candidate-section" style={{ marginTop: "14px" }}>
            {showCandidatesHeading ? (
              <p
                className="candidate-section-title"
                style={{ marginBottom: "8px" }}
              >
                Candidates (A–Z) — edit + uncheck junk:
                <span
                  className="candidate-found"
                  style={{ marginLeft: "10px", opacity: 0.9 }}
                >
                  Imported: {scanImportedCount} / {selectedCandidateIds.size}
                </span>
              </p>
            ) : (
              <p
                className="candidate-section-title"
                style={{ marginBottom: "8px" }}
              >
                <span className="candidate-found" style={{ opacity: 0.9 }}>
                  Imported: {scanImportedCount} / {selectedCandidateIds.size}
                </span>
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "10px",
                alignItems: "center",
              }}
              className="group-import-drop"
            >
              <label
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ opacity: 0.9 }}>Add imports to group:</span>

                <select
                  value={importTargetGroupId}
                  onChange={(e) => setImportTargetGroupId(e.target.value)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.25)",
                    color: "white",
                  }}
                >
                  <option value="none">None</option>
                  {customFilters
                    .filter(
                      (g) => g.id !== "all-platforms" && g.id !== "ungrouped",
                    )
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {safeText(g.name, "Group")}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div
              className="candidate-actions"
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "10px",
              }}
            >
              <button
                className="btn btn-ghost candidate-btn candidate-btn-select-all"
                type="button"
                onClick={selectAllCandidates}
              >
                Select All
              </button>

              <button
                className="btn btn-ghost candidate-btn candidate-btn-select-none"
                type="button"
                onClick={deselectAllCandidates}
              >
                Select None
              </button>

              <button
                className="btn btn-primary candidate-btn candidate-btn-import"
                type="button"
                onClick={importSelectedCandidatesDirect}
                disabled={
                  candidates.length === 0 || selectedCandidateIds.size === 0
                }
              >
                Import Selected
              </button>
            </div>

            <div
              className="candidate-grid scanned-text-grid"
              style={{ display: "grid", gap: "8px" }}
            >
              {candidates.map((c) => {
                const checked = selectedCandidateIds.has(c.id);
                const state = candidateImportStatus?.[c.id]?.state;
                const message = candidateImportStatus?.[c.id]?.message;

                return (
                  <div
                    key={c.id}
                    className={[
                      "candidate-card",
                      checked ? "is-selected" : "",
                      state ? `is-${state}` : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
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
                      className="candidate-row"
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <input
                        className="candidate-checkbox"
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCandidate(c.id)}
                      />

                      <input
                        className="candidate-input"
                        value={c.cleaned}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCandidates((prev) =>
                            prev.map((x) =>
                              x.id === c.id ? { ...x, cleaned: val } : x,
                            ),
                          );
                        }}
                        style={{
                          flex: 1,
                          background: "rgba(0,0,0,0.25)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          color: "white",
                          padding: "8px 10px",
                          borderRadius: "10px",
                        }}
                      />

                      {state && (
                        <span
                          className={[
                            "candidate-status",
                            state ? `is-${state}` : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {state}
                        </span>
                      )}

                      <button
                        className="btn btn-ghost candidate-remove-btn"
                        type="button"
                        onClick={() => removeCandidate(c.id)}
                      >
                        Remove
                      </button>
                    </div>

                    {(state === "error" || state === "skipped") && message && (
                      <p className="candidate-error" style={{ margin: 0 }}>
                        {state === "error" ? "❌" : "ℹ️"} {message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {(importSummary.imported > 0 ||
              importSummary.notFound > 0 ||
              importSummary.skipped > 0) && (
              <div className="import-summary" style={{ marginTop: "12px" }}>
                <p className="import-summary-text" style={{ margin: 0 }}>
                  Imported: <strong>{importSummary.imported}</strong>
                  {" — "}
                  Skipped: <strong>{importSummary.skipped}</strong>
                  {" — "}
                  Not found: <strong>{importSummary.notFound}</strong>
                </p>
              </div>
            )}

            {notFoundCandidates.length > 0 && (
              <div className="not-found-panel" style={{ marginTop: "10px" }}>
                <p className="not-found-title" style={{ margin: "6px 0" }}>
                  Couldn’t find these — add manually:
                </p>
                <ul
                  className="not-found-list"
                  style={{ margin: 0, paddingLeft: "18px" }}
                >
                  {notFoundCandidates.map((x) => (
                    <li key={x.id} className="not-found-item">
                      {x.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ===========================================================================
    RENDER
  =========================================================================== */
  return (
    <main className="library-page">

      <section className="library-header-card">
        <div className="library-header-main">
          <div className="library-kicker">
            <span className="library-kicker-dot"></span>
            <span>Your Library</span>
          </div>
          <h1>All your games in one place.</h1>
          <p>
            Track what you’re playing, what you’ve finished, and what’s still
            living in the backlog. Import your games by text, image, or through
            steam, and group together in anyway you want!
          </p>

          <div className="library-header-actions">
            <Link to="/search" className="btn btn-primary">
              Search For Game
            </Link>

            <a href="#filter-settings">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={openImportPanel}
              >
                Import Games (Images / Steam Sync)
              </button>
            </a>

            <a href="#filter-settings">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={openTextImportPanel}
              >
                Import Games (Game Titles)
              </button>
            </a>
          </div>
        </div>

        <div className="library-header-meta">
          <div className="library-stat total-game-stat">
            <div className="library-stat-label">Total games</div>
            <div className="library-stat-value">
              {loadingStats ? "…" : total}
            </div>
            <div className="library-stat-sub">
              {loadingStats ? "Loading…" : `${completed} completed`}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="library-filters">
          <div>
            <button
              className={`filter-pill ${statusFilter === "all" ? "is-active" : ""}`}
              onClick={() => handleStatusFilterChange("all")}
            >
              <span>All</span>
              <span className="filter-count">
                {loadingStats ? "…" : groupStats.total}
              </span>
            </button>

            <button
              className={`filter-pill ${statusFilter === "backlog" ? "is-active" : ""}`}
              onClick={() => handleStatusFilterChange("backlog")}
            >
              <span>Backlog</span>
              <span className="filter-count">
                {loadingStats ? "…" : groupStats.backlog}
              </span>
            </button>

            <button
              className={`filter-pill ${statusFilter === "completed" ? "is-active" : ""}`}
              onClick={() => handleStatusFilterChange("completed")}
            >
              <span>Completed</span>
              <span className="filter-count">
                {loadingStats ? "…" : groupStats.completed}
              </span>
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
                className={`filter-pill ${safeActiveGroupIds.includes(f.id) ? "is-active" : ""}`}
                onClick={() => handleToggleGroup(f.id)}
              >
                {safeText(f.name, "Group")}
              </button>
            ))}

            {realSelectedGroupIds.length === 1 && (
              <a href="#filter-settings" className="add-to-group-con">
                <button
                  type="button"
                  className="add-to-group btn btn-primary"
                  onClick={handleHeaderAddToGroup}
                >
                  Manage Group
                </button>
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="library-search-bar" style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
              setIsPageDropdownOpen(false);
            }}
            placeholder="Search your library..."
            style={{
              flex: 1,
              minWidth: "240px",
              padding: "10px 12px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(0,0,0,0.25)",
              color: "white",
            }}
          />

          {searchTerm.trim() && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
                setIsPageDropdownOpen(false);
              }}
            >
              Clear
            </button>
          )}
        </div>
      </section>

      <section className="library-grid">
        {searchTerm.trim() ? (
          <h3 className="search-query-text">
            Searching for “{searchTerm.trim()}” ({sortedGames.length} result
            {sortedGames.length === 1 ? "" : "s"})
          </h3>
        ) : (
          <h3 className="search-query-text"></h3>
        )}

        <div className="sort-by-con">
          <p>Sort by</p>
          <div className="sorting">
            <button type="button" onClick={revealSortingDrop}>
              {getSortLabel(sortBy)}
            </button>

            <div className="invisible">
              <button
                type="button"
                className={sortBy === "name_asc" ? "active" : ""}
                onClick={() => handleSortingOptionClick("name_asc")}
              >
                Name (A-Z)
              </button>

              <button
                type="button"
                className={sortBy === "name_desc" ? "active" : ""}
                onClick={() => handleSortingOptionClick("name_desc")}
              >
                Name (Z-A)
              </button>

              <button
                type="button"
                className={sortBy === "meta_desc" ? "active" : ""}
                onClick={() => handleSortingOptionClick("meta_desc")}
              >
                Metacritic (High-Low)
              </button>

              <button
                type="button"
                className={sortBy === "meta_asc" ? "active" : ""}
                onClick={() => handleSortingOptionClick("meta_asc")}
              >
                Metacritic (Low-High)
              </button>
            </div>
          </div>
        </div>

        <div className="game-grid">
          {loadingStats ? (
            <div className="loading-con">
              <img src={loadingIcon} alt="Loading" />
              <p>Loading your library…</p>
            </div>
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
                game.metacritic ??
                game.metacriticScore ??
                game.metaScore ??
                null;
              const hasScore =
                metacriticScore !== null && metacriticScore !== undefined;

              const groupTags = Array.from(
                new Set(
                  customFilters
                    .filter(
                      (g) =>
                        g.id !== "all-platforms" &&
                        g.id !== "ungrouped" &&
                        Array.isArray(g.gameIds) &&
                        g.gameIds.some((id) => String(id) === String(game.id)),
                    )
                    .map((g) => safeText(g.name, ""))
                    .filter(Boolean),
                ),
              ).sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: "base" }),
              );

              const gameHash = game.rawgId || game.slug || game.id;

              return (
                <div className="game-wrapper" key={String(game.id)}>
                  <Link className="game-link" to={`/game#${gameHash}`}>
                    <div className="game-card">
                      <div
                        className="game-img"
                        style={
                          imageUrl
                            ? { backgroundImage: `url("${imageUrl}")` }
                            : {}
                        }
                      />

                      <div className="game-info">
                        <p className="game-title">
                          {safeText(game.title, "Untitled game")}
                        </p>
                        <div className="game-sub-info">
                          {primaryGenre && (
                            <p className="game-genre">{primaryGenre}</p>
                          )}
                          <p className="game-meta">
                            {hasScore
                              ? `${metacriticScore} Metacritic`
                              : "Unrated"}
                          </p>
                        </div>
                      </div>

                      {groupTags.length > 0 && (
                        <div className="game-group-tags">
                          {groupTags.map((name) => (
                            <span
                              key={`${game.id}-${name}`}
                              className="game-group-tag"
                            >
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

        {!loadingStats && sortedGames.length > 0 && (
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
                  {dropdownPages.map((pageNumber) => (
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
                  ))}
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
              ? "Import Games"
              : panelMode === "text"
                ? "Text Import"
                : editingGroupId
                  ? "Edit Group"
                  : "Create Custom Group"}
          </h2>

          {/* ===========================
              TEXT IMPORT MODE
          ============================ */}
          {panelMode === "text" && (
            <div className="import-settings">
              <div className="text-import" style={{ marginBottom: "18px" }}>
                <p>Paste a Game List (one title per line)</p>

                <textarea
                  className="scan-detected-text"
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
                  placeholder={`Example:\nHalo 3\nDead Space\nFinal Fantasy VII`}
                />

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginTop: "10px",
                  }}
                >
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleRegenerateCandidatesFromTextarea}
                    disabled={!scanCleanText.trim()}
                    title={
                      !scanCleanText.trim()
                        ? "Paste at least one title first"
                        : ""
                    }
                  >
                    {hasGeneratedCandidates
                      ? "Regenerate Game Selection"
                      : "Generate Game Selection"}
                  </button>

                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      setScanText("");
                      setScanCleanText("");
                      setCandidates([]);
                      setSelectedCandidateIds(new Set());
                      setCandidateImportStatus({});
                      setNotFoundCandidates([]);
                      setImportSummary({
                        imported: 0,
                        notFound: 0,
                        skipped: 0,
                      });
                      setImportTargetGroupId("none");
                    }}
                  >
                    Clear
                  </button>

                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={openImportPanel}
                  >
                    Import from Images / Steam
                  </button>
                </div>

                {!hasGeneratedCandidates ? (
                  <p style={{ opacity: 0.85, marginTop: "10px" }}>
                    Paste titles above, then click <strong>Generate</strong> to
                    build candidates.
                  </p>
                ) : (
                  renderCandidateImportUI({
                    title: "Candidates (A–Z) — edit + uncheck junk:",
                    showTextarea: false,
                    showRegenerateButton: false,
                    showCandidatesHeading: false,
                  })
                )}
              </div>
            </div>
          )}

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
                <div
                  className="game-selection-toggle"
                  onClick={toggleGameSelection}
                >
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
                <div>
                  {/* <input type="checkbox">Remove From Group</input>
                  <input type="checkbox">Remove From Library</input> */}
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
              IMPORT MODE (IMAGES + STEAM)
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

              <div className="image-scan">
                <p>Import from Image</p>

                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={openScanFilePicker}
                  disabled={scanLoading}
                >
                  {scanLoading ? "Scanning..." : "Upload"}
                </button>

                {scanPreviewUrls.length > 0 && (
                  <div
                    className="game-images-con"
                    style={{ marginTop: "10px" }}
                  >
                    {scanPreviewUrls.map((src, idx) => (
                      <div className="game-image" key={`${src}-${idx}`}>
                        <img src={src} alt={`Scan ${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                )}

                {scanError && (
                  <p className="scan-error" style={{ marginTop: "10px" }}>
                    ❌ {scanError}
                  </p>
                )}

                {!scanLoading &&
                  scanCleanText &&
                  renderCandidateImportUI({
                    title: "Detected games (A–Z) — editable:",
                  })}
              </div>

              {!scanLoading &&
                scanPreviewUrls.length === 0 &&
                !scanCleanText && (
                  <div className="steam-sync">
                    <p>Import from Steam Library</p>

                    {steamCheckLoading || steamLinked === null ? (
                      <p style={{ opacity: 0.85 }}>Checking Steam link…</p>
                    ) : steamLinked ? (
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() =>
                          handleSteamSync({ allowAutoRelink: false })
                        }
                        disabled={!authUser?.uid}
                        title={!authUser?.uid ? "Sign in first" : ""}
                      >
                        Sync Steam Library
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={handleSteamLogin}
                        disabled={!authUser?.uid}
                        title={!authUser?.uid ? "Sign in first" : ""}
                      >
                        Link Steam For Library Sync
                      </button>
                    )}

                    {steamLinked && (
                      <button
                        className="btn btn-ghost"
                        type="button"
                        style={{ marginTop: "10px" }}
                        onClick={async () => {
                          try {
                            await logoutSteamSession();
                          } catch {
                            // ignore
                          } finally {
                            setSteamLinked(false);
                            setSteamTitles([]);
                            setScanError(
                              "Steam unlinked in this browser. Link again to sync.",
                            );
                          }
                        }}
                      >
                        Unlink Steam
                      </button>
                    )}

                    <div style={{ marginTop: "12px" }}>
                      <p>Import Games By Title</p>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={openTextImportPanel}
                      >
                        Enter Games Manually
                      </button>
                    </div>
                  </div>
                )}
            </div>
          )}

          <button className="close-button" onClick={closeCustomFilterPanel}>
            <span>X</span>
          </button>
        </div>
      </section>

    </main>
  );
}

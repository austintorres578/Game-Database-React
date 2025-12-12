import { useEffect, useState } from "react";
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

const ITEMS_PER_PAGE = 12;

// ✅ your deployed backend
const BACKEND_BASE = "https://game-database-backend.onrender.com";

export default function YourLibrary() {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    backlog: 0,
    playing: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Logged-in user
  const [authUser, setAuthUser] = useState(null);

  // All games in the user's library
  const [libraryGames, setLibraryGames] = useState([]);

  // Active status filter for main library view: "all" | "backlog" | "completed"
  const [statusFilter, setStatusFilter] = useState("all");

  // 🔹 Active group filters: allow multiple, default to ["all-platforms"]
  const [activeGroupIds, setActiveGroupIds] = useState(["all-platforms"]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);

  // Show/hide game selection list in modal
  const [showGameSelection, setShowGameSelection] = useState(false);

  // When building a group, which games are selected (by Firestore id)
  const [selectedGroupGameIds, setSelectedGroupGameIds] = useState([]);

  // Custom group builder
  const [filterName, setFilterName] = useState("");
  const [field, setField] = useState("platform");
  const [operator, setOperator] = useState("eq");
  const [value, setValue] = useState("");
  const [pinned, setPinned] = useState(true);

  // If not null, we are editing this group's doc instead of creating a new one
  const [editingGroupId, setEditingGroupId] = useState(null);

  // Permanent groups
  const ALL_PLATFORMS_FILTER = {
    id: "all-platforms",
    name: "All Platforms",
    pinned: true,
    gameIds: null, // null = no restriction
  };

  const UNGROUPED_FILTER = {
    id: "ungrouped",
    name: "Ungrouped",
    pinned: true,
    gameIds: "__UNGROUPED__", // sentinel
  };

  // Groups (default + Firestore groups)
  const [customFilters, setCustomFilters] = useState([
    ALL_PLATFORMS_FILTER,
    UNGROUPED_FILTER,
  ]);

  // ✅ Helper supports array OR updater fn, and persists safely
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

  // 🔹 Toggle a group in/out of selection (with special permanent behavior)
  function handleToggleGroup(groupId) {
    setActiveGroups((prev) => {
      let nextIds;

      // Special behavior for permanent groups
      if (groupId === "all-platforms") {
        nextIds = ["all-platforms"];
      } else if (groupId === "ungrouped") {
        nextIds = ["ungrouped"];
      } else {
        const prevArr = Array.isArray(prev) ? prev : ["all-platforms"];

        // if a permanent single-select is active, start fresh
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

  // ✅ Steam login redirect
  function handleSteamLogin() {
    window.location.href = `${BACKEND_BASE}/auth/steam`;
  }

  // ✅ Steam import: /api/me + /api/steam/owned-games
  async function handleSteamImport() {
    try {
      const meRes = await fetch(`${BACKEND_BASE}/api/me`, {
        credentials: "include",
      });

      const meData = await meRes.json();
      console.log("✅ Steam /api/me:", meData);

      if (!meRes.ok || !meData?.loggedIn) {
        alert("Steam session not found. Please Sign in with Steam first.");
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

      // Optional: log only titles
      console.log(
        "🎮 Steam titles:",
        (gamesData.games || []).map((g) => g.name)
      );
    } catch (err) {
      console.error("🔥 Steam import error:", err);
    }
  }

  // ✅ Auto-run after successful Steam redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("steam") === "linked") {
      handleSteamImport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load stats + full library list + groups
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
        // 🔹 Load library
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
            data.title ||
            data.name ||
            data.gameTitle ||
            data.game_name ||
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
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        );

        setStats({ total, completed, backlog, playing });
        setLibraryGames(sortedGames);

        // 🔹 Load groups from Firestore
        const groupsRef = collection(db, "users", user.uid, "groups");
        const groupsSnap = await getDocs(groupsRef);

        let userGroups = groupsSnap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "Untitled Group",
            pinned: data.pinned ?? true, // ✅ IMPORTANT: default pinned true
            gameIds: Array.isArray(data.gameIds)
              ? data.gameIds.map((id) => String(id))
              : [],
            field: data.field || "platform",
            operator: data.operator || "eq",
            value: data.value || "",
          };
        });

        userGroups = userGroups.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );

        const fullFilters = [
          ALL_PLATFORMS_FILTER,
          UNGROUPED_FILTER,
          ...userGroups,
        ];
        setCustomFilters(fullFilters);

        // Restore last active group(s)
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

  const { total, completed, backlog } = stats;

  const safeActiveGroupIds = Array.isArray(activeGroupIds)
    ? activeGroupIds
    : ["all-platforms"];

  const onlyUngroupedSelected =
    safeActiveGroupIds.length === 1 && safeActiveGroupIds[0] === "ungrouped";

  // Non-permanent selected group ids
  const realSelectedGroupIds = safeActiveGroupIds.filter(
    (id) => id !== "all-platforms" && id !== "ungrouped"
  );

  // 🔹 Group filtering
  let groupFilteredGames = libraryGames;

  // ✅ If UNGROUPED is selected: show games NOT in any user group
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
    // ✅ Otherwise: union of selected groups
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

  // Derived stats for current group filter
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

  // Status filter on top
  let filteredGames = groupFilteredGames;

  if (statusFilter !== "all") {
    filteredGames = filteredGames.filter((game) => {
      const status = game.status?.toLowerCase?.() || "";
      if (statusFilter === "backlog") return status === "backlog";
      if (statusFilter === "completed") return status === "completed";
      return true;
    });
  }

  function handleStatusFilterChange(nextStatus) {
    setStatusFilter(nextStatus);
    setCurrentPage(1);
    setIsPageDropdownOpen(false);
  }

  const totalPages =
    filteredGames.length === 0
      ? 1
      : Math.ceil(filteredGames.length / ITEMS_PER_PAGE);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageGames = filteredGames.slice(startIndex, endIndex);

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
      pinned,
      gameIds: (selectedGroupGameIds || []).map((id) => String(id)),
    };

    try {
      if (editingGroupId) {
        const groupDocRef = doc(
          db,
          "users",
          authUser.uid,
          "groups",
          editingGroupId
        );
        await setDoc(groupDocRef, newFilter, { merge: false });

        setCustomFilters((prev) => {
          const permanent = prev.filter(
            (g) => g.id === "all-platforms" || g.id === "ungrouped"
          );
          const rest = prev.filter(
            (g) => g.id !== "all-platforms" && g.id !== "ungrouped"
          );

          const updatedRest = rest
            .map((g) =>
              g.id === editingGroupId ? { id: editingGroupId, ...newFilter } : g
            )
            .sort((a, b) =>
              a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
            );

          return [...permanent, ...updatedRest];
        });

        setActiveGroups((prev) => {
          const arr = Array.isArray(prev) ? prev : ["all-platforms"];
          const nonPermanent = arr.filter(
            (id) => id !== "all-platforms" && id !== "ungrouped"
          );
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
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          );

          return [...permanent, ...updatedRest];
        });

        setActiveGroups([docRef.id]);
      }

      setFilterName("");
      setValue("");
      setPinned(true);
      setField("platform");
      setOperator("eq");
      setSelectedGroupGameIds([]);
      setShowGameSelection(false);
      setEditingGroupId(null);
      setCurrentPage(1);
      setIsPageDropdownOpen(false);
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
      "Are you sure you want to delete this group?"
    );
    if (!confirmed) return;

    try {
      const groupDocRef = doc(
        db,
        "users",
        authUser.uid,
        "groups",
        editingGroupId
      );
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
      setPinned(true);
      setField("platform");
      setOperator("eq");
      setSelectedGroupGameIds([]);
      setShowGameSelection(false);
      setEditingGroupId(null);
      setCurrentPage(1);
      setIsPageDropdownOpen(false);

      const panel = document.querySelector(".custom-filter-settings-con");
      if (panel) {
        panel.style.pointerEvents = "none";
        panel.style.opacity = "0";
      }
    } catch (err) {
      console.error("Error deleting group:", err);
      alert("There was a problem deleting this group. Please try again.");
    }
  }

  function openCustomFilterPanel() {
    const panel = document.querySelector(".custom-filter-settings-con");
    if (panel) {
      panel.style.pointerEvents = "auto";
      panel.style.opacity = "1";
    }
  }

  function openNewGroupPanel() {
    setEditingGroupId(null);
    setFilterName("");
    setField("platform");
    setOperator("eq");
    setValue("");
    setPinned(true);
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

    setFilterName("");
    setValue("");
    setPinned(true);
    setField("platform");
    setOperator("eq");
    setSelectedGroupGameIds([]);
    setShowGameSelection(false);
    setEditingGroupId(null);
  }

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
    const activeGroup =
      groupId && groupId !== "all-platforms" && groupId !== "ungrouped"
        ? customFilters.find((g) => g.id === groupId)
        : null;

    let baseIds = [];
    if (activeGroup && Array.isArray(activeGroup.gameIds)) {
      baseIds = activeGroup.gameIds.map(String);
    }

    let baseName = activeGroup?.name || "";
    let baseField = activeGroup?.field || "platform";
    let baseOperator = activeGroup?.operator || "eq";
    let baseValue = activeGroup?.value || "";
    let basePinned = activeGroup?.pinned ?? true;

    if (extraGameId && !baseIds.includes(String(extraGameId))) {
      baseIds = [...baseIds, String(extraGameId)];
    }

    setFilterName(baseName);
    setField(baseField);
    setOperator(baseOperator);
    setValue(baseValue);
    setPinned(basePinned);
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

  return (
    <main className="library-page">
      <Header />

      {/* HEADER CARD */}
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

            <button className="btn btn-ghost">Import Games To Library</button>

            {/* ✅ Steam login */}
            <button className="btn btn-primary steam-login-btn invisible" onClick={handleSteamLogin}>
              Sign in with Steam
            </button>

            {/* ✅ Steam import */}
            <button className="btn btn-ghost invisible" onClick={handleSteamImport}>
              Steam Import
            </button>
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

      {/* FILTERS */}
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
              className={`filter-pill ${
                statusFilter === "backlog" ? "is-active" : ""
              }`}
              onClick={() => handleStatusFilterChange("backlog")}
            >
              <span>Backlog</span>
              <span className="filter-count">
                {loadingStats ? "…" : groupStats.backlog}
              </span>
            </button>

            <button
              className={`filter-pill ${
                statusFilter === "completed" ? "is-active" : ""
              }`}
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
            {customFilters
              .filter((f) => f.pinned)
              .map((f) => (
                <button
                  key={f.id}
                  className={`filter-pill ${
                    safeActiveGroupIds.includes(f.id) ? "is-active" : ""
                  }`}
                  onClick={() => handleToggleGroup(f.id)}
                >
                  {f.name}
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

      {/* MAIN LIBRARY GRID */}
      <section className="library-grid">
        <div className="game-grid">
          {loadingStats ? (
            <p>Loading your library…</p>
          ) : pageGames.length === 0 ? (
            <p>No games match this filter yet.</p>
          ) : (
            pageGames.map((game) => {
              const imageUrl =
                game.backgroundImage ||
                game.background_image ||
                game.coverImage ||
                game.image ||
                "";

              const genresArray =
                game.genres || game.genreList || game.genre_names || [];

              const primaryGenre = Array.isArray(genresArray)
                ? genresArray[0]
                : typeof genresArray === "string"
                ? genresArray
                : "";

              const metacriticScore =
                game.metacritic ||
                game.metacriticScore ||
                game.metaScore ||
                null;

              const hasScore =
                metacriticScore !== null && metacriticScore !== undefined;

              // ✅ ALWAYS compute group tags for this game (deduped)
              const groupTags = Array.from(
                new Set(
                  customFilters
                    .filter(
                      (g) =>
                        g.id !== "all-platforms" &&
                        g.id !== "ungrouped" &&
                        Array.isArray(g.gameIds) &&
                        g.gameIds.some(
                          (id) => String(id) === String(game.id)
                        )
                    )
                    .map((g) => g.name)
                    .filter(Boolean)
                )
              ).sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: "base" })
              );

              const gameHash = game.rawgId || game.slug || game.id;

              return (
                <div className="game-wrapper" key={game.id}>
                  <Link className="game-link" to={`/game#${gameHash}`}>
                    <div className="game-card">
                      <div
                        className="game-img"
                        style={
                          imageUrl
                            ? { backgroundImage: `url("${imageUrl}")` }
                            : {}
                        }
                      ></div>

                      <div className="game-info">
                        <p className="game-title">{game.title}</p>
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

                      {/* ✅ Group tags are CHILDREN of game-card and ALWAYS visible */}
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

        {/* PAGINATION */}
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

      {/* GROUP MODAL */}
      <section className="custom-filter-settings-con">
        <div id="filter-settings" className="custom-filter-settings">
          <h2>{editingGroupId ? "Edit Group" : "Create Custom Group"}</h2>

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
                          key={game.id}
                          className={`filter-game${checked ? " selected-game" : ""}`}
                          onClick={() => toggleGameInGroup(game.id)}
                        >
                          <p>{game.title}</p>
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

          <button className="close-button" onClick={closeCustomFilterPanel}>
            <span>X</span>
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}

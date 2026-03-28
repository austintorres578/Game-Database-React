import { useEffect, useState } from "react";
import { auth, onAuthStateChanged } from "../../firebase/fireAuth";
import { collection, getDocs, db } from "../../firebase/firestore";
import { safeText } from "../../utils/yourLibrary/sortHelpers";
import {
  readLibraryViewState,
  writeLibraryViewState,
} from "../../utils/yourLibrary/viewStatePersistence";

export const ALL_PLATFORMS_FILTER = {
  id: "all-platforms",
  name: "All Games",
  gameIds: null,
};

export const UNGROUPED_FILTER = {
  id: "ungrouped",
  name: "Ungrouped",
  gameIds: "__UNGROUPED__",
};

/**
 * Loads the authenticated user's library, groups, and persisted view state.
 * Also persists view state changes back to localStorage.
 */
export function useLibraryData() {
  const [authUser, setAuthUser] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    backlog: 0,
    playing: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [libraryGames, setLibraryGames] = useState([]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [activeGroupIds, setActiveGroupIds] = useState(["all-platforms"]);
  const [sortBy, setSortBy] = useState("name_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customFilters, setCustomFilters] = useState([
    ALL_PLATFORMS_FILTER,
    UNGROUPED_FILTER,
  ]);

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

  /* -------------------------------------------------------------------------
    AUTH LISTENER → LOAD LIBRARY + GROUPS + RESTORE VIEW STATE
  -------------------------------------------------------------------------- */
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
            { sensitivity: "base" },
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
          String(a.name || "").localeCompare(
            String(b.name || ""),
            undefined,
            { sensitivity: "base" },
          ),
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

            if (Number.isFinite(Number(saved.currentPage)))
              restoredPage = Math.max(1, Number(saved.currentPage));

            if (
              typeof saved.sortBy === "string" &&
              ["name_asc", "name_desc", "meta_desc", "meta_asc", "rawg_desc", "rawg_asc"].includes(
                saved.sortBy,
              )
            ) {
              restoredSortBy = saved.sortBy;
            }

            if (typeof saved.searchTerm === "string")
              restoredSearchTerm = saved.searchTerm;

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

  /* -------------------------------------------------------------------------
    PERSIST VIEW STATE
  -------------------------------------------------------------------------- */
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

  return {
    authUser,
    stats,
    loadingStats,
    libraryGames,
    setLibraryGames,
    statusFilter,
    setStatusFilter,
    activeGroupIds,
    setActiveGroupIds,
    setActiveGroups,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    isPageDropdownOpen,
    setIsPageDropdownOpen,
    searchTerm,
    setSearchTerm,
    customFilters,
    setCustomFilters,
  };
}

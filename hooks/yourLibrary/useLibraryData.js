import { useEffect, useRef, useState } from "react";
import { auth, onAuthStateChanged } from "../../firebase/fireAuth";
import { collection, onSnapshot, query, db } from "../../firebase/firestore";
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
  const unsubLibraryRef = useRef(null);
  const unsubGroupsRef = useRef(null);
  const unsubCompletedRef = useRef(null);
  const initializedRef = useRef(false);

  const [authUser, setAuthUser] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    backlog: 0,
    playing: 0,
  });
  const [completedCount, setCompletedCount] = useState(0);
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
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);

      if (unsubLibraryRef.current) { unsubLibraryRef.current(); unsubLibraryRef.current = null; }
      if (unsubGroupsRef.current) { unsubGroupsRef.current(); unsubGroupsRef.current = null; }
      if (unsubCompletedRef.current) { unsubCompletedRef.current(); unsubCompletedRef.current = null; }
      initializedRef.current = false;

      if (!user) {
        setStats({ total: 0, completed: 0, backlog: 0, playing: 0 });
        setCompletedCount(0);
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

      // --- LIBRARY LISTENER ---
      const libraryRef = query(collection(db, "users", user.uid, "library"));
      unsubLibraryRef.current = onSnapshot(libraryRef, (snapshot) => {
        let total = 0, backlog = 0, playing = 0;
        const games = [];

        snapshot.forEach((docSnap) => {
          total += 1;
          const data = docSnap.data();
          const title = safeText(data.title) || "Untitled game";
          games.push({ id: String(docSnap.id), title, ...data });

          const status = data.status?.toLowerCase?.() || "";
          if (status === "backlog") backlog++;
          else if (status === "playing") playing++;
        });

        const sortedGames = games.sort((a, b) =>
          String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" })
        );

        setStats((prev) => ({ ...prev, total, backlog, playing }));
        setLibraryGames(sortedGames);
      }, (err) => {
        console.error("Library snapshot error:", err);
      });

      // --- COMPLETED LISTENER ---
      const completedRef = query(collection(db, "users", user.uid, "completed"));
      unsubCompletedRef.current = onSnapshot(completedRef, (snapshot) => {
        const count = snapshot.size;
        setCompletedCount(count);
        setStats((prev) => ({ ...prev, completed: count }));
      }, (err) => {
        console.error("Completed snapshot error:", err);
      });

      // --- GROUPS LISTENER ---
      const groupsRef = query(collection(db, "users", user.uid, "groups"));
      unsubGroupsRef.current = onSnapshot(groupsRef, (groupsSnap) => {
        let userGroups = groupsSnap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: safeText(data.name, "Untitled Group") || "Untitled Group",
            gameIds: Array.isArray(data.gameIds) ? data.gameIds.map((id) => String(id)) : [],
            field: data.field || "platform",
            operator: data.operator || "eq",
            value: data.value || "",
          };
        });

        userGroups = userGroups.sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" })
        );

        const fullFilters = [ALL_PLATFORMS_FILTER, UNGROUPED_FILTER, ...userGroups];
        setCustomFilters(fullFilters);

        // View state restore — runs once per login session only
        if (!initializedRef.current) {
          initializedRef.current = true;

          let restoredGroups = ["all-platforms"];
          let restoredStatus = "all";
          let restoredPage = 1;
          let restoredSortBy = "name_asc";
          let restoredSearchTerm = "";

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
                if (validIds.length > 0) restoredGroups = validIds;
              } catch { /* ignore */ }
            }

            const saved = readLibraryViewState(user.uid);
            if (saved) {
              if (typeof saved.statusFilter === "string") restoredStatus = saved.statusFilter;
              if (Number.isFinite(Number(saved.currentPage))) restoredPage = Math.max(1, Number(saved.currentPage));
              if (
                typeof saved.sortBy === "string" &&
                ["name_asc", "name_desc", "meta_desc", "meta_asc", "rawg_desc", "rawg_asc"].includes(saved.sortBy)
              ) restoredSortBy = saved.sortBy;
              if (typeof saved.searchTerm === "string") restoredSearchTerm = saved.searchTerm;

              const savedGroupsRaw = saved.activeGroupIds;
              const savedGroups = Array.isArray(savedGroupsRaw)
                ? savedGroupsRaw
                : typeof savedGroupsRaw === "string" ? [savedGroupsRaw] : [];
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

          setStatusFilter(restoredStatus);
          setActiveGroupIds(restoredGroups);
          setCurrentPage(restoredPage);
          setSortBy(restoredSortBy);
          setSearchTerm(restoredSearchTerm);
          setIsPageDropdownOpen(false);
          setLoadingStats(false);
        }
      }, (err) => {
        console.error("Groups snapshot error:", err);
        setLoadingStats(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubLibraryRef.current) unsubLibraryRef.current();
      if (unsubGroupsRef.current) unsubGroupsRef.current();
      if (unsubCompletedRef.current) unsubCompletedRef.current();
    };
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

import { useState } from "react";

import {
  createGroupInFirestore,
  updateGroupInFirestore,
  deleteGroupFromFirestore,
} from "../services/yourLibrary/groupService";

import { logoutSteamSession } from "../services/yourLibrary/steamService";

import "../styles/yourLibrary.css";

import LibraryStatsHeader from "../components/yourLibrary/LibraryStatsHeader";
import StatusFiltersBar from "../components/yourLibrary/StatusFiltersBar";
import LibrarySearchBar from "../components/yourLibrary/LibrarySearchBar";
import SortSelector from "../components/yourLibrary/SortSelector";
import GameGrid from "../components/yourLibrary/GameGrid";
import LibraryPagination from "../components/yourLibrary/LibraryPagination";
import GroupPanel from "../components/yourLibrary/GroupPanel";
import ImportPanel from "../components/yourLibrary/ImportPanel";
import CandidateList from "../components/yourLibrary/CandidateList";

import { safeText, compareByTitle, compareByMetacritic } from "../utils/yourLibrary/sortHelpers";

import { useLibraryData } from "../hooks/yourLibrary/useLibraryData";
import { useSteamSync } from "../hooks/yourLibrary/useSteamSync";
import { useImportFlow } from "../hooks/yourLibrary/useImportFlow";

/* =============================================================================
  CONFIG
============================================================================= */
const ITEMS_PER_PAGE = 12;

export default function YourLibrary() {
  /* -----------------------------------------------------------------------
    HOOKS
  ----------------------------------------------------------------------- */
  const {
    authUser,
    stats,
    loadingStats,
    libraryGames,
    setLibraryGames,
    statusFilter,
    setStatusFilter,
    activeGroupIds,
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
  } = useLibraryData();

  const importFlow = useImportFlow({
    authUser,
    libraryGames,
    setLibraryGames,
    customFilters,
    setCustomFilters,
  });

  const steamSync = useSteamSync({
    authUser,
    onCandidatesReady: ({ sortedTitles, nextCandidates }) => {
      importFlow.clearForNewScan();
      importFlow.setScanCleanText(sortedTitles.join("\n"));
      importFlow.setCandidates(nextCandidates);
      importFlow.setSelectedCandidateIds(
        new Set(nextCandidates.map((c) => c.id)),
      );
      setPanelMode("import");
      openCustomFilterPanel();
    },
    onError: (msg) => importFlow.setScanError(msg),
  });

  /* -----------------------------------------------------------------------
    STATE: GROUP BUILDER (PANEL)
  ----------------------------------------------------------------------- */
  const [panelMode, setPanelMode] = useState("group");
  const [showGameSelection, setShowGameSelection] = useState(false);
  const [selectedGroupGameIds, setSelectedGroupGameIds] = useState([]);
  const [filterName, setFilterName] = useState("");
  const [field, setField] = useState("platform");
  const [operator, setOperator] = useState("eq");
  const [value, setValue] = useState("");
  const [editingGroupId, setEditingGroupId] = useState(null);

  /* -----------------------------------------------------------------------
    PANEL OPEN / CLOSE
  ----------------------------------------------------------------------- */
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

    importFlow.clearAll();
  }

  /* -----------------------------------------------------------------------
    UI HANDLERS: STATUS + GROUP FILTERS
  ----------------------------------------------------------------------- */
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

  /* -----------------------------------------------------------------------
    DERIVED VALUES: GROUP + STATUS + SEARCH FILTER + SORT + PAGINATION
  ----------------------------------------------------------------------- */
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

  const pageGames = sortedGames.slice(startIndex, endIndex);

  const scanImportedCount = Object.values(
    importFlow.candidateImportStatus || {},
  ).reduce((acc, v) => (v?.state === "imported" ? acc + 1 : acc), 0);

  const hasGeneratedCandidates = importFlow.candidates.length > 0;

  /* -----------------------------------------------------------------------
    GROUP CRUD HANDLERS
  ----------------------------------------------------------------------- */
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
                { sensitivity: "base" },
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
        const savedFilter = await createGroupInFirestore(
          authUser.uid,
          newFilter,
        );

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
              { sensitivity: "base" },
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

  /* -----------------------------------------------------------------------
    GROUP PANEL HELPERS
  ----------------------------------------------------------------------- */
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

  /* -----------------------------------------------------------------------
    SORT HANDLERS
  ----------------------------------------------------------------------- */
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
    if (menu) menu.classList.add("invisible");
  }

  /* -----------------------------------------------------------------------
    STEAM UNLINK (inline — needs both steamSync and importFlow setters)
  ----------------------------------------------------------------------- */
  async function handleSteamUnlink() {
    steamSync.setSteamUnlinking(true);
    try {
      await logoutSteamSession();
    } catch {
      // ignore
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      steamSync.setSteamUnlinking(false);
      steamSync.setSteamLinked(false);
      steamSync.setSteamTitles([]);
      importFlow.setScanError(
        "Steam unlinked in this browser. Link again to sync.",
      );
    }
  }

  /* -----------------------------------------------------------------------
    CANDIDATE CLEANED VALUE CHANGE (threads down to importFlow)
  ----------------------------------------------------------------------- */
  function handleCandidateCleanedChange(id, val) {
    importFlow.setCandidates((prev) =>
      prev.map((x) => (x.id === id ? { ...x, cleaned: val } : x)),
    );
  }

  /* -----------------------------------------------------------------------
    RENDER
  ----------------------------------------------------------------------- */
  return (
    <main className="library-page">

      <LibraryStatsHeader
        total={total}
        completed={completed}
        loadingStats={loadingStats}
        onOpenImportPanel={openImportPanel}
        onOpenTextImportPanel={openTextImportPanel}
      />

      <StatusFiltersBar
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        loadingStats={loadingStats}
        groupStats={groupStats}
        customFilters={customFilters}
        safeActiveGroupIds={safeActiveGroupIds}
        onToggleGroup={handleToggleGroup}
        realSelectedGroupIds={realSelectedGroupIds}
        onHeaderAddToGroup={handleHeaderAddToGroup}
        onOpenNewGroupPanel={openNewGroupPanel}
      />

      <LibrarySearchBar
        searchTerm={searchTerm}
        onSearchChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
          setIsPageDropdownOpen(false);
        }}
        onClear={() => {
          setSearchTerm("");
          setCurrentPage(1);
          setIsPageDropdownOpen(false);
        }}
      />

      <section className="library-grid">
        <SortSelector
          sortBy={sortBy}
          searchTerm={searchTerm}
          sortedGamesCount={sortedGames.length}
          onRevealDrop={revealSortingDrop}
          onSortOptionClick={handleSortingOptionClick}
        />

        <GameGrid
          loadingStats={loadingStats}
          pageGames={pageGames}
          customFilters={customFilters}
          onAddToGroup={handleAddToGroupFromGame}
        />

        {!loadingStats && sortedGames.length > 0 && (
          <LibraryPagination
            safeCurrentPage={safeCurrentPage}
            totalPages={totalPages}
            isPageDropdownOpen={isPageDropdownOpen}
            setIsPageDropdownOpen={setIsPageDropdownOpen}
            dropdownPages={dropdownPages}
            onPrevPage={() => {
              setCurrentPage((prev) => Math.max(1, prev - 1));
              setIsPageDropdownOpen(false);
            }}
            onNextPage={() => {
              setCurrentPage((prev) => Math.min(totalPages, prev + 1));
              setIsPageDropdownOpen(false);
            }}
            onGoToPage={(pageNumber) => {
              setCurrentPage(pageNumber);
              setIsPageDropdownOpen(false);
            }}
          />
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
                  value={importFlow.scanCleanText}
                  onChange={(e) => importFlow.setScanCleanText(e.target.value)}
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
                    onClick={importFlow.handleRegenerateCandidatesFromTextarea}
                    disabled={!importFlow.scanCleanText.trim()}
                    title={
                      !importFlow.scanCleanText.trim()
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
                    onClick={() => importFlow.clearForNewScan()}
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
                  <CandidateList
                    title="Candidates (A–Z) — edit + uncheck junk:"
                    showTextarea={false}
                    showRegenerateButton={false}
                    showCandidatesHeading={false}
                    scanCleanText={importFlow.scanCleanText}
                    onScanCleanTextChange={(e) =>
                      importFlow.setScanCleanText(e.target.value)
                    }
                    onRegenerate={importFlow.handleRegenerateCandidatesFromTextarea}
                    candidates={importFlow.candidates}
                    onCandidateCleanedChange={handleCandidateCleanedChange}
                    selectedCandidateIds={importFlow.selectedCandidateIds}
                    candidateImportStatus={importFlow.candidateImportStatus}
                    importTargetGroupId={importFlow.importTargetGroupId}
                    onImportTargetGroupChange={(e) =>
                      importFlow.setImportTargetGroupId(e.target.value)
                    }
                    customFilters={customFilters}
                    scanImportedCount={scanImportedCount}
                    onToggleCandidate={importFlow.toggleCandidate}
                    onSelectAll={importFlow.selectAllCandidates}
                    onDeselectAll={importFlow.deselectAllCandidates}
                    onImport={importFlow.importSelectedCandidatesDirect}
                    onRemoveCandidate={importFlow.removeCandidate}
                    importSummary={importFlow.importSummary}
                    notFoundCandidates={importFlow.notFoundCandidates}
                  />
                )}
              </div>
            </div>
          )}

          {/* ===========================
              GROUP MODE
          ============================ */}
          {panelMode === "group" && (
            <GroupPanel
              filterName={filterName}
              onFilterNameChange={(e) => setFilterName(e.target.value)}
              showGameSelection={showGameSelection}
              onToggleGameSelection={toggleGameSelection}
              selectedGroupGameIds={selectedGroupGameIds}
              libraryGames={libraryGames}
              onToggleGameInGroup={toggleGameInGroup}
              editingGroupId={editingGroupId}
              onSubmit={handleCreateFilter}
              onDelete={handleDeleteGroup}
            />
          )}

          {/* ===========================
              IMPORT MODE (IMAGES + STEAM)
          ============================ */}
          {panelMode === "import" && (
            <ImportPanel
              scanFileInputRef={importFlow.scanFileInputRef}
              onScanFileChange={importFlow.handleScanFileChange}
              scanLoading={importFlow.scanLoading}
              onOpenScanFilePicker={importFlow.openScanFilePicker}
              scanPreviewUrls={importFlow.scanPreviewUrls}
              scanError={importFlow.scanError}
              scanCleanText={importFlow.scanCleanText}
              onScanCleanTextChange={(e) =>
                importFlow.setScanCleanText(e.target.value)
              }
              onRegenerate={importFlow.handleRegenerateCandidatesFromTextarea}
              candidates={importFlow.candidates}
              onCandidateCleanedChange={handleCandidateCleanedChange}
              selectedCandidateIds={importFlow.selectedCandidateIds}
              candidateImportStatus={importFlow.candidateImportStatus}
              importTargetGroupId={importFlow.importTargetGroupId}
              onImportTargetGroupChange={(e) =>
                importFlow.setImportTargetGroupId(e.target.value)
              }
              customFilters={customFilters}
              scanImportedCount={scanImportedCount}
              onToggleCandidate={importFlow.toggleCandidate}
              onSelectAll={importFlow.selectAllCandidates}
              onDeselectAll={importFlow.deselectAllCandidates}
              onImport={importFlow.importSelectedCandidatesDirect}
              onRemoveCandidate={importFlow.removeCandidate}
              importSummary={importFlow.importSummary}
              notFoundCandidates={importFlow.notFoundCandidates}
              steamCheckLoading={steamSync.steamCheckLoading}
              steamLinked={steamSync.steamLinked}
              steamUnlinking={steamSync.steamUnlinking}
              authUser={authUser}
              onSteamSync={steamSync.handleSteamSync}
              onSteamLogin={steamSync.handleSteamLogin}
              onSteamUnlink={handleSteamUnlink}
              onOpenTextImportPanel={openTextImportPanel}
            />
          )}

          <button className="close-button" onClick={closeCustomFilterPanel}>
            <span>X</span>
          </button>
        </div>
      </section>

    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  scanImageForText,
  extractGameTitlesWithLLM,
} from "../../services/yourLibrary/scanService";
import {
  searchGameByTitle,
  saveGameToLibraryFirestore,
} from "../../services/yourLibrary/gameSearchService";
import { addGameIdsToGroupFirestore } from "../../services/yourLibrary/groupService";
import {
  getResultId,
  normalizeResultToLibraryDoc,
  pickBestResult,
  titlesToCandidates,
  parseTitlesFromTextarea,
} from "../../utils/yourLibrary/importHelpers";
import {
  isGameInGroup,
  isGameUngrouped,
} from "../../utils/yourLibrary/groupFilterHelpers";

/**
 * Manages all state and logic for the image-scan and text-based import flow.
 *
 * @param {object|null} authUser - Firebase auth user
 * @param {object[]} libraryGames - Current library game list
 * @param {function} setLibraryGames - Setter to merge newly imported games in
 * @param {object[]} customFilters - Current group filter list
 * @param {function} setCustomFilters - Setter to update group membership after import
 */
export function useImportFlow({
  authUser,
  libraryGames,
  setLibraryGames,
  customFilters,
  setCustomFilters,
}) {
  const scanFileInputRef = useRef(null);

  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanText, setScanText] = useState("");
  const [scanCleanText, setScanCleanText] = useState("");
  const [scanPreviewUrls, setScanPreviewUrls] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState(new Set());
  const [candidateImportStatus, setCandidateImportStatus] = useState({});
  const [notFoundCandidates, setNotFoundCandidates] = useState([]);
  const [importSummary, setImportSummary] = useState({
    imported: 0,
    notFound: 0,
    skipped: 0,
  });
  const [importTargetGroupId, setImportTargetGroupId] = useState("none");

  /* -------------------------------------------------------------------------
    EFFECT: CLEANUP PREVIEW URLS ON UNMOUNT
  -------------------------------------------------------------------------- */
  useEffect(() => {
    return () => {
      try {
        scanPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      } catch {
        // ignore
      }
    };
  }, [scanPreviewUrls]);

  /* -------------------------------------------------------------------------
    RESET HELPERS
  -------------------------------------------------------------------------- */

  /** Clears all import state in preparation for a new scan/steam sync result. */
  function clearForNewScan() {
    setScanError("");
    setScanText("");
    setScanCleanText("");
    setCandidates([]);
    setSelectedCandidateIds(new Set());
    setCandidateImportStatus({});
    setNotFoundCandidates([]);
    setImportSummary({ imported: 0, notFound: 0, skipped: 0 });
    setImportTargetGroupId("none");
  }

  /** Full reset including preview URL revocation (called when closing the panel). */
  function clearAll() {
    clearForNewScan();
    setScanPreviewUrls((prev) => {
      try {
        prev.forEach((u) => URL.revokeObjectURL(u));
      } catch {
        // ignore
      }
      return [];
    });
  }

  /* -------------------------------------------------------------------------
    SCAN FILE PICKER
  -------------------------------------------------------------------------- */
  function openScanFilePicker() {
    clearForNewScan();
    if (scanFileInputRef.current) scanFileInputRef.current.click();
  }

  /* -------------------------------------------------------------------------
    CANDIDATE CONTROLS
  -------------------------------------------------------------------------- */
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

  /* -------------------------------------------------------------------------
    ADD GAME IDS TO GROUP
  -------------------------------------------------------------------------- */
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

  /* -------------------------------------------------------------------------
    IMPORT SELECTED CANDIDATES
  -------------------------------------------------------------------------- */
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
                { sensitivity: "base" },
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

  /* -------------------------------------------------------------------------
    REGENERATE CANDIDATES FROM TEXTAREA
  -------------------------------------------------------------------------- */
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

  /* -------------------------------------------------------------------------
    MULTI-IMAGE SCAN FLOW
  -------------------------------------------------------------------------- */
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

  return {
    scanFileInputRef,
    scanLoading,
    scanError,
    setScanError,
    scanText,
    setScanText,
    scanCleanText,
    setScanCleanText,
    scanPreviewUrls,
    candidates,
    setCandidates,
    selectedCandidateIds,
    setSelectedCandidateIds,
    candidateImportStatus,
    notFoundCandidates,
    importSummary,
    importTargetGroupId,
    setImportTargetGroupId,
    clearForNewScan,
    clearAll,
    openScanFilePicker,
    toggleCandidate,
    selectAllCandidates,
    deselectAllCandidates,
    removeCandidate,
    addGameIdsToGroup,
    importSelectedCandidatesDirect,
    handleRegenerateCandidatesFromTextarea,
    handleScanFileChange,
  };
}

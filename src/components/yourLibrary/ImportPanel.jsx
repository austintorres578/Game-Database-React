import { useState, useRef, useEffect } from "react";
import CandidateList from "./CandidateList";
import { extractGameTitlesWithLLM } from "../../services/yourLibrary/scanService";
import steamLogo from "../../assets/images/steamLogo.png";

/**
 * Renders the import panel (image scan + Steam sync).
 * panelMode === "import"
 */
export default function ImportPanel({
  // file scan
  scanFileInputRef,
  onScanFileChange,
  scanLoading,
  onOpenScanFilePicker,
  scanPreviewUrls,
  scanError,
  // candidate list shared props
  scanCleanText,
  onScanCleanTextChange,
  onRegenerate,
  candidates,
  onCandidateCleanedChange,
  selectedCandidateIds,
  candidateImportStatus,
  importTargetGroupId,
  onImportTargetGroupChange,
  customFilters,
  scanImportedCount,
  onToggleCandidate,
  onSelectAll,
  onDeselectAll,
  onImport,
  isImporting = false,
  onRemoveCandidate,
  importSummary,
  notFoundCandidates,
  // steam
  steamCheckLoading,
  steamLinked,
  steamUnlinking,
  authUser,
  onSteamSync,
  onSteamLogin,
  onSteamUnlink,
  // navigation
  onOpenTextImportPanel,
  onCreateGroup,
  onGenerateLoadingChange,
  onClose,
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [view, setView] = useState("options");
  const [titleCount, setTitleCount] = useState(0);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [selectedGames, setSelectedGames] = useState(new Set());
  const [editingGames, setEditingGames] = useState(new Set());
  const [removedGames, setRemovedGames] = useState(new Set());
  const [editValues, setEditValues] = useState({});
  const [savedTitles, setSavedTitles] = useState({});
  const [hasImportStarted, setHasImportStarted] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupSelectOpen, setGroupSelectOpen] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (candidates?.length) console.log("Steam games:", candidates);
  }, [candidates]);

  useEffect(() => {
    if (scanCleanText) {
      console.log("Screenshot detected games:", scanCleanText);
      const lines = scanCleanText.split("\n").filter((l) => l.trim() !== "");
      setSelectedGames(new Set(lines.map((_, i) => i)));
    }
  }, [scanCleanText]);

  useEffect(() => {
    if (scanError) alert(scanError);
  }, [scanError]);

  useEffect(() => {
    onGenerateLoadingChange?.(generateLoading);
  }, [generateLoading]);

  useEffect(() => {
    if (isImporting) setHasImportStarted(true);
  }, [isImporting]);

  return (
    <div className="import-settings">
      <input
        ref={scanFileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={onScanFileChange}
      />
      <div
        className="import-options-con"
        style={{
          display:
            view === "text-import" || (!scanLoading && scanCleanText)
              ? "none"
              : undefined,
        }}
      >
        <div className="import-options-header">
          <span className="pre-header">Add to Library</span>
          <h3>How would you like to import?</h3>
          <span className="post-header">
            Pick a method — you can always change this later.
          </span>
        </div>
        <div
          style={
            scanLoading ? { pointerEvents: "none", opacity: 0.5 } : undefined
          }
        >
          <div
            className={`import-option${selectedOption === "steam" ? " active" : ""}`}
            onClick={() => setSelectedOption("steam")}
          >
            <div className="icon-con">
              <div className="icon">
                <img src={steamLogo} alt="Steam Logo" />
              </div>
            </div>
            <div className="import-option-copy steam-option">
              <h3>Steam Library Sync</h3>
              <p>
                Connect your Steam account and import your entire library
                automatically.
              </p>
            </div>
            <div className="import-checkbox">
              <div></div>
            </div>
          </div>
          <div
            className={`import-option${selectedOption === "screenshot" ? " active" : ""}`}
            onClick={() => setSelectedOption("screenshot")}
          >
            <div className="icon-con">
              <div className="icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="size-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                  />
                </svg>
              </div>
            </div>
            <div className="import-option-copy">
              <h3>Scan a Image</h3>
              <p>
                Upload a photo or screenshot of your game collection and we'll
                detect the titles.
              </p>
              <p className="disclaimer">
                The clearer the image, the better — make sure titles are
                legible.
              </p>
            </div>
            <div className="import-checkbox">
              <div></div>
            </div>
          </div>
          <div
            className={`import-option${selectedOption === "manual" ? " active" : ""}`}
            onClick={() => setSelectedOption("manual")}
          >
            <div className="icon-con">
              <div className="icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="size-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                  />
                </svg>
              </div>
            </div>
            <div className="import-option-copy">
              <h3>Enter Titles Manually</h3>
              <p>
                Type or paste a list of game titles and we'll match them to our
                database.
              </p>
            </div>
            <div className="import-checkbox">
              <div></div>
            </div>
          </div>
        </div>
        <button
          className={`continue-button${selectedOption ? " active" : ""}`}
          disabled={scanLoading}
          onClick={() => {
            if (selectedOption === "manual") setView("text-import");
            if (selectedOption === "steam") {
              if (!authUser?.uid || !steamLinked) onSteamLogin();
              else onSteamSync({ allowAutoRelink: false });
            }
            if (selectedOption === "screenshot") onOpenScanFilePicker();
          }}
        >
          {scanLoading && selectedOption === "screenshot"
            ? "Scanning image..."
            : "Continue"}
        </button>
      </div>
      <div
        className="detected-games-con"
        style={{ display: !scanLoading && scanCleanText ? "block" : "none" }}
      >
        <div className="import-options-header">
          <span className="pre-header">Game Library</span>
          <h3>Review Detected Games</h3>
        </div>
        <div className="missing-game-header">
          <span className="pre-header yellow">Import Results</span>
          <h3>Some games weren't found</h3>
          <p>These titles couldn't be matched to our database. You can skip them, or save selected titles as custom games.</p>
        </div>
        <div className="unmatched-disclaimer">
          <div className="disclaimer-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div className="disclaimer-text">
            <p className="title">Unmatched Games</p>
            <p>These may be typos, regional titles, or games not yet in our database</p>
          </div>
          <div className="unmatched-count">
            <p className="count">6</p>
            <p>Unmatched</p>
          </div>
        </div>
        {/* <div className="textarea-pre">
          <span>Detected games — editable</span>
          <span>One title per line</span>
        </div>
        <textarea
          placeholder="Detected games will appear here for review and editing."
          value={scanCleanText}
          onChange={(e) => onScanCleanTextChange(e.target.value)}
        />
        <button className="regen-button" disabled={isImporting} onClick={() => {
          const lines = scanCleanText.split('\n').filter(l => l.trim() !== '');
          setSelectedGames(new Set(lines.map((_, i) => i)));
        }}>
          <svg
            id="regenIco"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Regenerate Game Selection
        </button> */}
        <div className="import-group-con">
          <div>
            <span>Import games to group:</span>
          </div>
          <div className="import-options" style={{ display: showNewGroup ? "none" : undefined }}>
            {/* <select
              className="group-select"
              value={importTargetGroupId}
              onChange={onImportTargetGroupChange}
            >
              <option value="">Select Group</option>
              {customFilters
                .filter((g) => g.id !== "all-platforms" && g.id !== "ungrouped")
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </select> */}
            <div className={`group-select-con ${groupSelectOpen ? "active" : ""}`}>
              <div
                className="group-select-trigger"
                onClick={() => setGroupSelectOpen((v) => !v)}
              >
                <p>
                  {importTargetGroupId
                    ? customFilters.find((g) => g.id === importTargetGroupId)?.name || "Select A Group"
                    : "Select A Group"}
                </p>
              </div>
              <div className="group-options">
                <p
                  className={importTargetGroupId === "" ? "active" : ""}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onImportTargetGroupChange({ target: { value: "" } });
                    setGroupSelectOpen(false);
                  }}
                >
                  No Group
                </p>
                {customFilters
                  .filter((g) => g.id !== "all-platforms" && g.id !== "ungrouped")
                  .map((g) => (
                    <p
                      key={g.id}
                      className={importTargetGroupId === g.id ? "active" : ""}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onImportTargetGroupChange({ target: { value: g.id } });
                        setGroupSelectOpen(false);
                      }}
                    >
                      {g.name}
                    </p>
                  ))}
              </div>
            </div>
            <p>Or</p>
            <button onClick={() => setShowNewGroup(true)}>Add To New Group</button>
          </div>
          <div className="new-group-con" style={{ display: showNewGroup ? undefined : "none" }}>
            <input
              type="text"
              value={newGroupName}
              placeholder="New Group Name"
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <button
              onClick={async () => {
                if (!newGroupName.trim()) return;

                const isDuplicate = customFilters?.some(
                  (g) => g.name?.toLowerCase() === newGroupName.trim().toLowerCase()
                );
                if (isDuplicate) {
                  alert(`A group named "${newGroupName.trim()}" already exists.`);
                  return;
                }

                const newId = await onCreateGroup?.(newGroupName.trim());
                if (!newId) return;

                onImportTargetGroupChange({ target: { value: newId } });
                setNewGroupName("");
                setShowNewGroup(false);

                const lines = scanCleanText.split("\n").filter((l) => l.trim() !== "");
                const correctedLines = lines.map((line, i) =>
                  savedTitles[i] !== undefined ? savedTitles[i] : line
                );
                const selectedTitles = correctedLines
                  .filter((_, i) => selectedGames.has(i))
                  .join("\n");

                onScanCleanTextChange(selectedTitles);
                const { candidates: freshCandidates, selectedIds: freshSelectedIds } =
                  await onRegenerate(selectedTitles);
                onImport(freshCandidates, freshSelectedIds, newId);
              }}
            >
              Import
            </button>
            <button onClick={() => setShowNewGroup(false)}>Cancel</button>
          </div>
        </div>
        <div className="game-selection-con">
          <div className="game-actions">
            <div className="game-selection-buttons">
              <button
                disabled={isImporting}
                onClick={() => {
                  const lines = scanCleanText
                    .split("\n")
                    .filter((l) => l.trim() !== "");
                  setSelectedGames(new Set(lines.map((_, i) => i)));
                }}
              >
                Select All
              </button>
              <button
                disabled={isImporting}
                onClick={() => setSelectedGames(new Set())}
              >
                Select None
              </button>
            </div>
            <div>
              <span>
                <strong>{selectedGames.size}</strong> /{" "}
                {scanCleanText
                  ? scanCleanText.split("\n").filter((l) => l.trim() !== "")
                    .length
                  : 0}{" "}
                selected
              </span>
            </div>
          </div>
          <div className="detected-games">
            {scanCleanText &&
              (() => {
                const statusByTitle = {};
                (candidates || []).forEach((c) => {
                  const s = candidateImportStatus?.[c.id];
                  if (s)
                    statusByTitle[
                      String(c.cleaned || c.raw || "")
                        .trim()
                        .toLowerCase()
                    ] = s.state;
                });
                return scanCleanText
                  .split("\n")
                  .filter((l) => l.trim() !== "")
                  .map((title, i) => {
                    if (removedGames.has(i)) return null;
                    const state = statusByTitle[title.trim().toLowerCase()];
                    const statusLabel =
                      state === "imported"
                        ? "Imported"
                        : state === "skipped"
                          ? "Skipped"
                          : state === "notfound"
                            ? "Not Found"
                            : state === "error"
                              ? "Error"
                              : state === "importing"
                                ? "Importing..."
                                : "Pending";
                    return (
                      <div
                        key={i}
                        className={`detected-game${selectedGames.has(i) ? " selected" : ""}`}
                      >
                        <div
                          className={`branded-check ${selectedGames.has(i) ? "active" : ""}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedGames((prev) => {
                              const next = new Set(prev);
                              next.has(i) ? next.delete(i) : next.add(i);
                              return next;
                            });
                          }}
                        />
                        <div className="detected-title-con">
                          {!editingGames.has(i) && (
                            <p>{savedTitles[i] ?? title}</p>
                          )}
                          {editingGames.has(i) && (
                            <div className="edit-input-con">
                              <input
                                className="edit-input"
                                type="text"
                                value={editValues[i] ?? savedTitles[i] ?? title}
                                onChange={(e) =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    [i]: e.target.value,
                                  }))
                                }
                              />
                              <button
                                onClick={() => {
                                  setSavedTitles((prev) => ({
                                    ...prev,
                                    [i]:
                                      editValues[i] ?? savedTitles[i] ?? title,
                                  }));
                                  setEditingGames((prev) => {
                                    const next = new Set(prev);
                                    next.delete(i);
                                    return next;
                                  });
                                }}
                              >
                                Save
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="detected-actions">
                          <span className="candidate-status">
                            {hasImportStarted ? statusLabel : ""}
                          </span>
                          {!editingGames.has(i) && (
                            <button
                              disabled={isImporting}
                              onClick={() =>
                                setEditingGames((prev) => {
                                  const next = new Set(prev);
                                  next.has(i) ? next.delete(i) : next.add(i);
                                  return next;
                                })
                              }
                            >
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"></path>
                              </svg>
                            </button>
                          )}
                          <button
                            disabled={isImporting}
                            onClick={() => {
                              setRemovedGames((prev) => new Set([...prev, i]));
                              setSelectedGames((prev) => {
                                const next = new Set(prev);
                                next.delete(i);
                                return next;
                              });
                            }}
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  });
              })()}
          </div>
          <div className="custom-game-disclaimer">
            <div className="disclaimer-icon">
              🎮
            </div>
            <div className="disclaimer-text">
              <p className="title">Save As Custom Games</p>
              <p>These may be typos, regional titles, or games not yet in our database</p>
            </div>
            <div className="cta-con">
              <button className="disabled">Create As Custom Game</button>
            </div>
          </div>
          <div className="missing-ctas">
            <button>Skip Selected</button>
            <button>Skip All</button>
            <button className="yellow-button">Done</button>
          </div>
          <div className="detected-cta-con">
            <div>
              <span>
                {importSummary?.imported ?? 0} /{" "}
                <strong>{selectedGames.size}</strong> games imported
              </span>
            </div>
            <div className="detected-ctas">
              <button disabled={isImporting} onClick={onClose}>
                Cancel
              </button>
              <button
                disabled={
                  isImporting ||
                  selectedGames.size === 0 ||
                  (hasImportStarted && !isImporting)
                }
                onClick={async () => {
                  const lines = scanCleanText
                    .split("\n")
                    .filter((l) => l.trim() !== "");

                  const correctedLines = lines.map((line, i) =>
                    savedTitles[i] !== undefined ? savedTitles[i] : line
                  );

                  const selectedTitles = correctedLines
                    .filter((_, i) => selectedGames.has(i))
                    .join("\n");
                  onScanCleanTextChange(selectedTitles);
                  const {
                    candidates: freshCandidates,
                    selectedIds: freshSelectedIds,
                  } = await onRegenerate(selectedTitles);
                  onImport(freshCandidates, freshSelectedIds);
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>{" "}
                {isImporting
                  ? "Importing Games..."
                  : hasImportStarted
                    ? "Import Complete"
                    : "Import Selected"}
              </button>
            </div>
          </div>
        </div>

      </div>
      <div
        className="text-import-con"
        style={{ display: view === "text-import" ? "block" : "none" }}
      >
        <div className="text-import-header">
          <span className="pre-header">Text Import</span>
          <h3>Review Detected Games</h3>
          <span className="post-header">
            Paste a list of game titles, one per line.
          </span>
        </div>
        <div className="textarea-con">
          <textarea
            ref={textareaRef}
            placeholder={"Example:\nHalo 3\nDead Space\nFinal Fantasy VII\n..."}
            onInput={(e) => {
              const count = e.target.value
                .split("\n")
                .filter((l) => l.trim() !== "").length;
              setTitleCount(count);
            }}
          ></textarea>
          <p>
            {titleCount} {titleCount === 1 ? "title" : "titles"}
          </p>
        </div>
        <div className="text-disclaimer">
          <div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div>
            <p>
              Paste titles above, then click <strong>Generate</strong> to build
              your candidates. Each line is treated as one game title.
            </p>
          </div>
        </div>
        <div
          className="action-buttons"
          style={generateLoading ? { opacity: 0.5 } : undefined}
        >
          <button
            className="active"
            disabled={generateLoading}
            onClick={async () => {
              const text = textareaRef.current?.value;
              if (!text?.trim()) return;
              setGenerateLoading(true);
              try {
                const result = await extractGameTitlesWithLLM(text);
                console.log("Generated game selection:", result);
                onScanCleanTextChange(result.sortedTitles.join("\n"));
                setView("options");
              } catch (err) {
                console.error("Generate failed:", err);
              } finally {
                setGenerateLoading(false);
              }
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>{" "}
            {generateLoading
              ? "Scanning Game List..."
              : "Generate Game Selection"}
          </button>
          <button
            disabled={generateLoading}
            onClick={() => {
              if (textareaRef.current) {
                textareaRef.current.value = "";
                textareaRef.current.style.height = "auto";
              }
              setTitleCount(0);
            }}
          >
            Clear
          </button>
        </div>
        <div
          className="import-alt-con"
          style={generateLoading ? { opacity: 0.5 } : undefined}
        >
          <p>Or Import From</p>
          <div>
            <button
              disabled={generateLoading}
              onClick={() => {
                setView("options");
                onOpenScanFilePicker();
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>{" "}
              Screenshot / Image
            </button>
            <button
              disabled={generateLoading}
              onClick={() => {
                setView("options");
                if (!authUser?.uid || !steamLinked) onSteamLogin();
                else onSteamSync({ allowAutoRelink: false });
              }}
            >
              Steam Library
            </button>
          </div>
        </div>
      </div>
      {/* <input
        ref={scanFileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={onScanFileChange}
      />

      <div className="image-scan">
        {!scanCleanText && (
          <>
            <p>Import from Image</p>

            <button
              className="btn btn-primary"
              type="button"
              onClick={onOpenScanFilePicker}
              disabled={scanLoading}
            >
              {scanLoading ? "Scanning..." : "Upload"}
            </button>
          </>
        )}

        {scanPreviewUrls.length > 0 && !scanCleanText && (
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

        {!scanLoading && scanCleanText && (
          <CandidateList
            title="Detected games (A–Z) — editable:"
            scanCleanText={scanCleanText}
            onScanCleanTextChange={onScanCleanTextChange}
            onRegenerate={onRegenerate}
            candidates={candidates}
            onCandidateCleanedChange={onCandidateCleanedChange}
            selectedCandidateIds={selectedCandidateIds}
            candidateImportStatus={candidateImportStatus}
            importTargetGroupId={importTargetGroupId}
            onImportTargetGroupChange={onImportTargetGroupChange}
            customFilters={customFilters}
            scanImportedCount={scanImportedCount}
            onToggleCandidate={onToggleCandidate}
            onSelectAll={onSelectAll}
            onDeselectAll={onDeselectAll}
            onImport={onImport}
            onRemoveCandidate={onRemoveCandidate}
            importSummary={importSummary}
            notFoundCandidates={notFoundCandidates}
          />
        )}
      </div>

      {!scanLoading && scanPreviewUrls.length === 0 && !scanCleanText && (
        <div className="steam-sync">
          <p>Import from Steam Library</p>

          {steamCheckLoading ||
          steamLinked === null ||
          steamUnlinking ? (
            <p style={{ opacity: 0.85 }}>
              {steamUnlinking ? "Unlinking Steam…" : "Checking Steam link…"}
            </p>
          ) : steamLinked ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => onSteamSync({ allowAutoRelink: false })}
              disabled={!authUser?.uid}
              title={!authUser?.uid ? "Sign in first" : ""}
            >
              Sync Steam Library
            </button>
          ) : (
            <button
              className="btn btn-primary"
              type="button"
              onClick={onSteamLogin}
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
              onClick={onSteamUnlink}
            >
              Unlink Steam
            </button>
          )}

          <div style={{ marginTop: "12px" }}>
            <p>Import Games By Title</p>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={onOpenTextImportPanel}
            >
              Enter Games Manually
            </button>
          </div>
        </div>
      )} */}
    </div>
  );
}

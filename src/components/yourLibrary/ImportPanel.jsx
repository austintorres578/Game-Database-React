import { useState } from "react";
import CandidateList from "./CandidateList";

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
}) {
  const [selectedOption, setSelectedOption] = useState(null);

  return (
    <div className="import-settings">
      <div className="import-options-con">
        <div className="import-options-header">
          <span className="pre-header">Add to Library</span>
          <h3>How would you like to import?</h3>
          <span className="post-header">
            Pick a method — you can always change this later.
          </span>
        </div>
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
            <h3>Upload a Screenshot</h3>
            <p>
              Take a photo or screenshot of your game collection and we'll
              detect the titles.
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
        <button className={`continue-button${selectedOption ? " active" : ""}`}>
          Continue
        </button>
      </div>
      <div className="detected-games-con">
        <div className="import-options-header">
          <span className="pre-header">Game Library</span>
          <h3>Review Detected Games</h3>
          {/* <span className="post-header">
          Pick a method — you can always change this later.
        </span> */}
        </div>
        <div className="textarea-pre">
          <span>Detected games — editable</span>
          <span>One title per line</span>
        </div>
        <textarea
          placeholder="Detected games will appear here for review and editing."
          value={scanCleanText}
          onChange={(e) => onScanCleanTextChange(e.target.value)}
        />
        <button className="regen-button">
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
        </button>
        <div className="import-group-con">
          <div>
            <span>Add to group:</span>
          </div>
          <select class="group-select" id="groupSelect">
            <option value="">None</option>
            <option value="steam">Steam</option>
            <option value="steam-ethan">Steam (Ethan)</option>
            <option value="xbox">Xbox Series X/S</option>
            <option value="ungrouped">Ungrouped</option>
          </select>
        </div>
        <div className="game-selection-con">
          <div className="game-actions">
            <div className="game-selection-buttons">
              <button>Select All</button>
              <button>Select None</button>
            </div>
            <div>
              <span><strong>13</strong> / 13 selected</span>
            </div>
          </div>
          <div className="detected-games">
            <div className="detected-game selected">
              <input type="checkbox"></input>
              <p>Along the Edge</p>
              <div className="detected-actions">
                <button><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"></path></svg></button>
                <button><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              </div>
            </div>
            <div className="detected-game">
              <input type="checkbox"></input>
              <p>Along the Edge</p>
              <div className="detected-actions">
                <button><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"></path></svg></button>
                <button><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              </div>
            </div>
            <div className="detected-game">
              <input type="checkbox"></input>
              <p>Along the Edge</p>
              <div className="detected-actions">
                <button><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"></path></svg></button>
                <button><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              </div>
            </div>
          </div>
          <div className="detected-cta-con">
            <div>
              <span><strong>13</strong> games will be imported</span>
            </div>
            <div className="detected-ctas">
              <button>Cancel</button>
              <button><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Import Selected</button>
            </div>
          </div>
        </div>
      </div>
      <div className="text-import-con">
        <div className="text-import-header">
          <span className="pre-header">Text Import</span>
          <h3>Review Detected Games</h3>
          <span className="post-header">
            Paste a list of game titles, one per line.
          </span>
        </div>
        <div className="textarea-con">
          <textarea placeholder={"Example:\nHalo 3\nDead Space\nFinal Fantasy VII\n..."}>

          </textarea>
          <p>0 titles</p>
        </div>
        <div className="text-disclaimer">
          <div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <div>
            <p>Paste titles above, then click <strong>Generate</strong> to build your candidates. Each line is treated as one game title.</p>
          </div>
        </div>
        <div className="action-buttons">
            <button className="active"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> Generate Game Selection</button>
            <button>Clear</button>
        </div>
        <div className="import-alt-con">
          <p>Or Import From</p>
          <div>
            <button><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Screenshot / Image</button>
            <button>Steam Library</button>
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

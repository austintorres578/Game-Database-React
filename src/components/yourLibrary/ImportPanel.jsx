import CandidateList from "./CandidateList";

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
      )}
    </div>
  );
}

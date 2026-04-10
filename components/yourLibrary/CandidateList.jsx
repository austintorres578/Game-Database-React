import { safeText } from "../../utils/yourLibrary/sortHelpers";

/**
 * Renders the editable candidate list used by both the scan and text import flows.
 * Mirrors the former renderCandidateImportUI() inline function.
 */
export default function CandidateList({
  title = "Game list (A–Z) — editable:",
  showTextarea = true,
  showRegenerateButton = true,
  showCandidatesHeading = true,
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
}) {
  if (!scanCleanText) return null;

  return (
    <div className="scan-results" style={{ marginTop: "0px" }}>
      <p className="scan-results-title" style={{ marginBottom: "6px",marginTop:"0px" }}>
        {title}
      </p>

      {showTextarea && (
        <textarea
          className="scan-detected-text"
          value={scanCleanText}
          onChange={onScanCleanTextChange}
          rows={10}
          style={{
            width: "100%",
            resize: "vertical",
            padding: "10px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(0,0,0,0.25)",
            color: "white",
            height: "135px"
          }}
          placeholder="Paste or edit games here (one per line)..."
        />
      )}

      {showRegenerateButton && (
        <button
          style={{ marginTop: "10px" }}
          className="btn btn-primary"
          type="button"
          onClick={onRegenerate}
        >
          Regenerate Game Selection
        </button>
      )}

      {candidates.length > 0 && (
        <div className="candidate-section" style={{ marginTop: "14px" }}>
          {showCandidatesHeading ? (
            <></>
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
                onChange={onImportTargetGroupChange}
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
              onClick={onSelectAll}
            >
              Select All
            </button>

            <button
              className="btn btn-ghost candidate-btn candidate-btn-select-none"
              type="button"
              onClick={onDeselectAll}
            >
              Select None
            </button>

            <button
              className="btn btn-primary candidate-btn candidate-btn-import"
              type="button"
              onClick={onImport}
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
                    padding: "5px 10px",
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
                      onChange={() => onToggleCandidate(c.id)}
                    />

                    <input
                      className="candidate-input"
                      value={c.cleaned}
                      onChange={(e) => onCandidateCleanedChange(c.id, e.target.value)}
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
                      onClick={() => onRemoveCandidate(c.id)}
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
                Couldn't find these — add manually:
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

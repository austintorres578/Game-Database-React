export default function LibraryStatsPanel({ completedCount, backlogCount }) {
  return (
    <div className="profile-panel">
      <div className="profile-panel-header">
        <h2>Library stats</h2>
      </div>
      <span className="small-pill-label">Overview</span>
      <div className="backlog-stats-grid">
        <div className="backlog-stat-item">
          <strong>{completedCount}</strong>
          Completed
        </div>
        <div className="backlog-stat-item">
          <strong>{backlogCount}</strong>
          In backlog
        </div>
      </div>
    </div>
  );
}

export default function ProfilePreviewCard({
  previewSrc,
  displayName,
  username,
  shortAboutMe,
  profileTags,
  selectedPlatforms,
  gamesLogged,
  gamesCompleted,
  onAvatarChange,
}) {
  return (
    <section className="card">
      <div className="card-header">
        <h2>Profile Banner Preview</h2>
        <span>Updates as you customize below.</span>
      </div>

      <div className="profile-preview-main">
        <div className="profile-preview-avatar-wrapper">
          <label htmlFor="avatarInput" className="avatar-upload-label">
            <img
              className="profile-preview-avatar"
              src={previewSrc}
              alt="Profile Picture"
            />
          </label>

          <input
            id="avatarInput"
            type="file"
            accept="image/*"
            onChange={onAvatarChange}
            style={{ display: "none" }}
          />

          <div className="profile-status-dot"></div>
        </div>

        <div className="profile-preview-text">
          <div className="profile-name-row">
            <h2 className="profile-name">{displayName}</h2>
            <span className="profile-username">@{username}</span>
          </div>

          {shortAboutMe && (
            <p className="profile-about-preview">{shortAboutMe}</p>
          )}

          <div className="profile-tags">
            {profileTags.length === 0 ? (
              <span className="profile-tag-pill profile-tag-pill--empty">
                Add some profile tags below
              </span>
            ) : (
              profileTags.map((tag) => (
                <span key={tag} className="profile-tag-pill">
                  {tag}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="platform-title">Platforms</p>

      <div className="game-platforms">
        {selectedPlatforms.length === 0 ? (
          <span className="profile-tag-pill profile-tag-pill--empty">
            Add platforms below
          </span>
        ) : (
          selectedPlatforms.map((platform) => (
            <div key={platform}>{platform}</div>
          ))
        )}
      </div>

      <div className="profile-preview-footer">
        <div className="profile-preview-stats">
          <span className="profile-stat-pill">{gamesLogged} games logged</span>
          <span className="profile-stat-pill">{gamesCompleted} completed</span>
        </div>
      </div>
    </section>
  );
}

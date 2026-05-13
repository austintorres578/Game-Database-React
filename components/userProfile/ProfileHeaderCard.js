import { Link } from "react-router-dom";

export default function ProfileHeaderCard({
  displayName,
  username,
  shortAboutMe,
  profileTags,
  selectedPlatforms,
  totalTracked,
  completedCount,
  avatarSrc,
}) {
  return (
    <section className="profile-header-card">
      <div className="profile-main">
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar">
            <img src={avatarSrc} alt="Profile avatar" />
          </div>
          <div className="profile-status-dot"></div>
        </div>

        <div className="profile-identity">
          <div className="profile-name-row">
            <h1 className="profile-name">{displayName}</h1>
            <span className="profile-username">@{username}</span>
          </div>

          <p className="profile-subline">{shortAboutMe}</p>

          <div className="profile-tags">
            {profileTags.length === 0 ? (
              <span className="profile-tag profile-tag--empty">
                Add profile tags in settings
              </span>
            ) : (
              profileTags.map((tag) => (
                <span key={tag} className="profile-tag">
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
          <span className="profile-tag profile-tag--empty">
            Add platforms in settings
          </span>
        ) : (
          selectedPlatforms.map((platform) => (
            <div key={platform}>{platform}</div>
          ))
        )}
      </div>

      <div className="profile-actions">
        <Link to="/profile/customize">
          <button className="btn btn-primary">Edit profile</button>
        </Link>

        <div className="profile-stats-row">
          <div className="profile-stat-pill">
            <strong>{totalTracked}</strong> Games in library
          </div>
          <div className="profile-stat-pill">
            <strong>{completedCount}</strong> Completed
          </div>
        </div>
      </div>
    </section>
  );
}

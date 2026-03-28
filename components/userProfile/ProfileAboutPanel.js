export default function ProfileAboutPanel({ aboutMe, selectedGenres }) {
  return (
    <div className="profile-panel profile-about">
      <div className="profile-panel-header">
        <h2>About</h2>
      </div>
      <p>{aboutMe}</p>

      <span className="small-pill-label">Favorite genres</span>
      <div className="profile-tags-cloud">
        {selectedGenres.length === 0 ? (
          <span className="profile-tag profile-tag--empty">
            Add some favorite genres in settings
          </span>
        ) : (
          selectedGenres.map((genre) => (
            <span key={genre}>{genre}</span>
          ))
        )}
      </div>
    </div>
  );
}

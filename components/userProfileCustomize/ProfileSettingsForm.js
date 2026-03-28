import {
  allPlatforms,
  allGenres,
  allProfileTags,
} from "../../constants/profileTagOptions";
import { getDropdownPreviewText } from "../../utils/profileCustomization/formHelpers";

export default function ProfileSettingsForm({
  displayName,
  setDisplayName,
  shortAboutMe,
  setShortAboutMe,
  aboutMe,
  setAboutMe,
  profileTags,
  onToggleTag,
  selectedPlatforms,
  onTogglePlatform,
  selectedGenres,
  onToggleGenre,
  openDropdown,
  onToggleDropdown,
  error,
  saving,
  onSave,
  onDiscard,
}) {
  return (
    <section className="card">
      <div className="card-header">
        <h2>Profile settings</h2>
        <span>Save to apply changes globally.</span>
      </div>

      <form className="settings-form" onSubmit={onSave}>
        {error && <p className="form-error">{error}</p>}

        <div className="field-group">
          <div className="field-label-row">
            <label>Display Name*</label>
          </div>
          <input
            className="text-input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        <div className="field-group">
          <div className="field-label-row">
            <label>Short Bio*</label>
            <span>A short description of what you play.</span>
          </div>
          <textarea
            className="textarea-input"
            value={shortAboutMe}
            onChange={(e) => setShortAboutMe(e.target.value)}
            required
          />
        </div>

        <div className="field-group">
          <div className="field-label-row">
            <label>About Me*</label>
            <span>A longer description for your profile.</span>
          </div>
          <textarea
            className="textarea-input"
            value={aboutMe}
            onChange={(e) => setAboutMe(e.target.value)}
            required
          />
        </div>

        {/* Profile Tags */}
        <div className="field-group">
          <div className="field-label-row">
            <label>Profile Tags</label>
            <span>Select up to 5 tags.</span>
          </div>

          <div className="toggle-con">
            <button
              type="button"
              onClick={() => onToggleDropdown("tags")}
              className={`toggle-button ${openDropdown === "tags" ? "active" : ""}`}
              aria-expanded={openDropdown === "tags"}
              aria-controls="tags-chip-group"
            >
              <span className="toggle-button-text">
                {getDropdownPreviewText("Tags", profileTags)}
              </span>
            </button>

            <div
              id="tags-chip-group"
              className={`chip-group ${openDropdown === "tags" ? "reveal" : ""}`}
            >
              {allProfileTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={
                    "chip" + (profileTags.includes(tag) ? " chip--active" : "")
                  }
                  onClick={() => onToggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Platforms */}
        <div className="field-group">
          <div className="field-label-row">
            <label>Favorite Platforms</label>
          </div>

          <div className="toggle-con">
            <button
              type="button"
              onClick={() => onToggleDropdown("platforms")}
              className={`toggle-button ${openDropdown === "platforms" ? "active" : ""}`}
              aria-expanded={openDropdown === "platforms"}
              aria-controls="platforms-chip-group"
            >
              <span className="toggle-button-text">
                {getDropdownPreviewText("Platforms", selectedPlatforms)}
              </span>
            </button>

            <div
              id="platforms-chip-group"
              className={`chip-group ${openDropdown === "platforms" ? "reveal" : ""}`}
            >
              {allPlatforms.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  className={
                    "chip" +
                    (selectedPlatforms.includes(platform) ? " chip--active" : "")
                  }
                  onClick={() => onTogglePlatform(platform)}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Genres */}
        <div className="field-group">
          <div className="field-label-row">
            <label>Favorite Genres</label>
          </div>

          <div className="toggle-con">
            <button
              type="button"
              onClick={() => onToggleDropdown("genres")}
              className={`toggle-button ${openDropdown === "genres" ? "active" : ""}`}
              aria-expanded={openDropdown === "genres"}
              aria-controls="genres-chip-group"
            >
              <span className="toggle-button-text">
                {getDropdownPreviewText("Genres", selectedGenres)}
              </span>
            </button>

            <div
              id="genres-chip-group"
              className={`chip-group ${openDropdown === "genres" ? "reveal" : ""}`}
            >
              {allGenres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  className={
                    "chip" +
                    (selectedGenres.includes(genre) ? " chip--active" : "")
                  }
                  onClick={() => onToggleGenre(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onDiscard}>
            Discard
          </button>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

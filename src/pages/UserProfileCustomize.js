import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase/fireAuth";

import {
  allPlatforms,
  allGenres,
  allProfileTags,
} from "../constants/profileTagOptions";

import {
  DEFAULT_DISPLAY_NAME,
  DEFAULT_SHORT_BIO,
  DEFAULT_ABOUT_ME,
} from "../constants/profileDefaultCopy";

import { handleSaveSubmit } from "../services/profileCustomization/saveProfile";
import { loadCustomizeProfileAndStats } from "../services/profileCustomization/loadStats";

import { handleAvatarChange } from "../utils/profileCustomization/avatarChange";
import { getDropdownPreviewText, toggleArrayItem, toggleArrayItemWithMax } from "../utils/profileCustomization/formHelpers";

import userDefaultProfile from "../assets/images/defaultUser.png";
import "../styles/userProfileCustomize.css";

export default function UserProfileCustomizer() {

  console.log(auth.currentUser.displayName)

  // Avatar preview
  const [previewSrc, setPreviewSrc] = useState(userDefaultProfile);

  // Profile data
  const [displayName, setDisplayName] = useState(DEFAULT_DISPLAY_NAME);
  const [shortAboutMe, setShortAboutMe] = useState(DEFAULT_SHORT_BIO);
  const [aboutMe, setAboutMe] = useState(DEFAULT_ABOUT_ME);

  // Start with NO active platforms / genres / tags
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [profileTags, setProfileTags] = useState([]);

  // UX state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Preview stats
  const [gamesLogged, setGamesLogged] = useState(0);
  const [gamesCompleted, setGamesCompleted] = useState(0);

  // Only one dropdown open at a time
  const [openDropdown, setOpenDropdown] = useState(null);

  const resetFormToDefaults = () => {
    setDisplayName(DEFAULT_DISPLAY_NAME);
    setShortAboutMe(DEFAULT_SHORT_BIO);
    setAboutMe(DEFAULT_ABOUT_ME);
    setSelectedPlatforms([]);
    setSelectedGenres([]);
    setProfileTags([]);
    setPreviewSrc(userDefaultProfile);
    setGamesLogged(0);
    setGamesCompleted(0);
  };

  useEffect(() => {
    let isMounted = true;

    const prepareProfileAndStats = async () => {
      try {
        setError("");

        const data = await loadCustomizeProfileAndStats();

        if (!isMounted) return;

        const userData = data?.[0];
        const games = Array.isArray(data?.[1]) ? data[1] : [];

        if (!userData) {
          resetFormToDefaults();
          return;
        }

        setDisplayName(userData.displayName || DEFAULT_DISPLAY_NAME);
        setShortAboutMe(userData.shortAboutMe || DEFAULT_SHORT_BIO);
        setAboutMe(userData.aboutMe || DEFAULT_ABOUT_ME);

        setGamesLogged(games.length);
        setGamesCompleted(
          games.filter((game) => game.status === "completed").length,
        );

        setSelectedPlatforms(
          Array.isArray(userData.selectedPlatforms)
            ? userData.selectedPlatforms
            : [],
        );

        setSelectedGenres(
          Array.isArray(userData.selectedGenres) ? userData.selectedGenres : [],
        );

        setProfileTags(
          Array.isArray(userData.profileTags)
            ? userData.profileTags.slice(0, 5)
            : [],
        );

        setPreviewSrc(userData.avatarPreview || userDefaultProfile);
      } catch (err) {
        console.error("Failed to prepare profile and stats:", err);

        if (!isMounted) return;

        setError(
          "Failed to load your profile data. Please refresh and try again.",
        );
        resetFormToDefaults();
      }
    };

    prepareProfileAndStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleDropdown = (dropdownName) => {
    setOpenDropdown((prev) => {
      return prev === dropdownName ? null : dropdownName;
    });
  };

  const togglePlatform = (platform) =>
    setSelectedPlatforms((prev) => toggleArrayItem(prev, platform));

  const toggleGenre = (genre) =>
    setSelectedGenres((prev) => toggleArrayItem(prev, genre));

  // Max 5 tags
  const toggleProfileTag = (tag) =>
    setProfileTags((prev) => toggleArrayItemWithMax(prev, tag, 5));

  const prepareAvatarChange = async (e) => {
    try {
      const newPreviewSrc = await handleAvatarChange(e);

      if (!newPreviewSrc) return;

      setPreviewSrc(newPreviewSrc);
    } catch (err) {
      console.error("Failed to prepare avatar preview:", err);
      setError("Failed to load selected image.");
    }
  };

  const prepareSave = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setSaving(true);

      await handleSaveSubmit({
        displayName,
        shortAboutMe,
        aboutMe,
        selectedPlatforms,
        selectedGenres,
        profileTags,
        previewSrc,
      });

      alert("Profile saved successfully!");
    } catch (err) {
      console.error("Failed to save profile:", err);
      setError(err.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="profile-settings-shell">
        <header className="profile-settings-header">
          <div className="profile-settings-header-title">
            <h1>Customize your profile</h1>
          </div>

          <div className="profile-settings-header-cta">
            <Link to="/profile">
              <button type="button" className="btn btn-ghost">
                Back to profile
              </button>
            </Link>
          </div>
        </header>

        <div className="profile-settings-grid">
          {/* PROFILE PREVIEW */}
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
                  onChange={prepareAvatarChange}
                  style={{ display: "none" }}
                />

                <div className="profile-status-dot"></div>
              </div>

              <div className="profile-preview-text">
                <div className="profile-name-row">
                  <h2 className="profile-name">{displayName}</h2>
                  <span className="profile-username">@{auth.currentUser.displayName}</span>
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
                <span className="profile-stat-pill">
                  {gamesLogged} games logged
                </span>
                <span className="profile-stat-pill">
                  {gamesCompleted} completed
                </span>
              </div>
            </div>
          </section>

          {/* SETTINGS FORM */}
          <section className="card">
            <div className="card-header">
              <h2>Profile settings</h2>
              <span>Save to apply changes globally.</span>
            </div>

            <form className="settings-form" onSubmit={prepareSave}>
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
                    onClick={() => toggleDropdown("tags")}
                    className={`toggle-button ${
                      openDropdown === "tags" ? "active" : ""
                    }`}
                    aria-expanded={openDropdown === "tags"}
                    aria-controls="tags-chip-group"
                  >
                    <span className="toggle-button-text">
                      {getDropdownPreviewText("Tags", profileTags)}
                    </span>
                  </button>

                  <div
                    id="tags-chip-group"
                    className={`chip-group ${
                      openDropdown === "tags" ? "reveal" : ""
                    }`}
                  >
                    {allProfileTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={
                          "chip" +
                          (profileTags.includes(tag) ? " chip--active" : "")
                        }
                        onClick={() => toggleProfileTag(tag)}
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
                    onClick={() => toggleDropdown("platforms")}
                    className={`toggle-button ${
                      openDropdown === "platforms" ? "active" : ""
                    }`}
                    aria-expanded={openDropdown === "platforms"}
                    aria-controls="platforms-chip-group"
                  >
                    <span className="toggle-button-text">
                      {getDropdownPreviewText("Platforms", selectedPlatforms)}
                    </span>
                  </button>

                  <div
                    id="platforms-chip-group"
                    className={`chip-group ${
                      openDropdown === "platforms" ? "reveal" : ""
                    }`}
                  >
                    {allPlatforms.map((platform) => (
                      <button
                        key={platform}
                        type="button"
                        className={
                          "chip" +
                          (selectedPlatforms.includes(platform)
                            ? " chip--active"
                            : "")
                        }
                        onClick={() => togglePlatform(platform)}
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
                    onClick={() => toggleDropdown("genres")}
                    className={`toggle-button ${
                      openDropdown === "genres" ? "active" : ""
                    }`}
                    aria-expanded={openDropdown === "genres"}
                    aria-controls="genres-chip-group"
                  >
                    <span className="toggle-button-text">
                      {getDropdownPreviewText("Genres", selectedGenres)}
                    </span>
                  </button>

                  <div
                    id="genres-chip-group"
                    className={`chip-group ${
                      openDropdown === "genres" ? "reveal" : ""
                    }`}
                  >
                    {allGenres.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        className={
                          "chip" +
                          (selectedGenres.includes(genre)
                            ? " chip--active"
                            : "")
                        }
                        onClick={() => toggleGenre(genre)}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    resetFormToDefaults();
                    setError("");
                    setOpenDropdown(null);
                  }}
                >
                  Discard
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </section>
  );
}

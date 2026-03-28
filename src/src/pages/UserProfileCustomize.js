import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase/fireAuth";

import {
  DEFAULT_DISPLAY_NAME,
  DEFAULT_SHORT_BIO,
  DEFAULT_ABOUT_ME,
} from "../constants/profileDefaultCopy";

import { handleSaveSubmit } from "../services/profileCustomization/saveProfile";
import { loadCustomizeProfileAndStats } from "../services/profileCustomization/loadStats";

import { handleAvatarChange } from "../utils/profileCustomization/avatarChange";
import { toggleArrayItem, toggleArrayItemWithMax } from "../utils/profileCustomization/formHelpers";

import userDefaultProfile from "../assets/images/defaultUser.png";
import "../styles/userProfileCustomize.css";

import ProfilePreviewCard from "../components/userProfileCustomize/ProfilePreviewCard";
import ProfileSettingsForm from "../components/userProfileCustomize/ProfileSettingsForm";

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
          <ProfilePreviewCard
            previewSrc={previewSrc}
            displayName={displayName}
            username={auth.currentUser.displayName}
            shortAboutMe={shortAboutMe}
            profileTags={profileTags}
            selectedPlatforms={selectedPlatforms}
            gamesLogged={gamesLogged}
            gamesCompleted={gamesCompleted}
            onAvatarChange={prepareAvatarChange}
          />

          <ProfileSettingsForm
            displayName={displayName}
            setDisplayName={setDisplayName}
            shortAboutMe={shortAboutMe}
            setShortAboutMe={setShortAboutMe}
            aboutMe={aboutMe}
            setAboutMe={setAboutMe}
            profileTags={profileTags}
            onToggleTag={toggleProfileTag}
            selectedPlatforms={selectedPlatforms}
            onTogglePlatform={togglePlatform}
            selectedGenres={selectedGenres}
            onToggleGenre={toggleGenre}
            openDropdown={openDropdown}
            onToggleDropdown={toggleDropdown}
            error={error}
            saving={saving}
            onSave={prepareSave}
            onDiscard={() => {
              resetFormToDefaults();
              setError("");
              setOpenDropdown(null);
            }}
          />
        </div>
      </div>
    </section>
  );
}

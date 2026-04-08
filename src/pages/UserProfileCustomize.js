import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  console.log(auth.currentUser.displayName)

  // Avatar preview
  const [previewSrc, setPreviewSrc] = useState(userDefaultProfile);
  const [avatarFile, setAvatarFile] = useState(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState(null);

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

  // Baseline snapshot of last-saved values — used to detect unsaved changes
  const savedProfile = useRef(null);

  const sortedJson = (arr) => JSON.stringify([...(arr || [])].sort());

  const isDirty = savedProfile.current !== null && (
    displayName !== savedProfile.current.displayName ||
    shortAboutMe !== savedProfile.current.shortAboutMe ||
    aboutMe !== savedProfile.current.aboutMe ||
    sortedJson(selectedPlatforms) !== sortedJson(savedProfile.current.selectedPlatforms) ||
    sortedJson(selectedGenres) !== sortedJson(savedProfile.current.selectedGenres) ||
    sortedJson(profileTags) !== sortedJson(savedProfile.current.profileTags) ||
    avatarFile !== null
  );

  const resetFormToDefaults = () => {
    setDisplayName(DEFAULT_DISPLAY_NAME);
    setShortAboutMe(DEFAULT_SHORT_BIO);
    setAboutMe(DEFAULT_ABOUT_ME);
    setSelectedPlatforms([]);
    setSelectedGenres([]);
    setProfileTags([]);
    setPreviewSrc(userDefaultProfile);
    setAvatarFile(null);
    setExistingAvatarUrl(null);
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
        const completedGames = Array.isArray(data?.[2]) ? data[2] : [];

        if (!userData) {
          resetFormToDefaults();
          savedProfile.current = {
            displayName: DEFAULT_DISPLAY_NAME,
            shortAboutMe: DEFAULT_SHORT_BIO,
            aboutMe: DEFAULT_ABOUT_ME,
            selectedPlatforms: [],
            selectedGenres: [],
            profileTags: [],
          };
          return;
        }

        setDisplayName(userData.displayName || DEFAULT_DISPLAY_NAME);
        setShortAboutMe(userData.shortAboutMe || DEFAULT_SHORT_BIO);
        setAboutMe(userData.aboutMe || DEFAULT_ABOUT_ME);

        setGamesLogged(games.length);
        setGamesCompleted(completedGames.length);

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

        setExistingAvatarUrl(userData.avatarUrl || null);
        setPreviewSrc(userData.avatarUrl || userDefaultProfile);

        savedProfile.current = {
          displayName: userData.displayName || DEFAULT_DISPLAY_NAME,
          shortAboutMe: userData.shortAboutMe || DEFAULT_SHORT_BIO,
          aboutMe: userData.aboutMe || DEFAULT_ABOUT_ME,
          selectedPlatforms: Array.isArray(userData.selectedPlatforms) ? userData.selectedPlatforms : [],
          selectedGenres: Array.isArray(userData.selectedGenres) ? userData.selectedGenres : [],
          profileTags: Array.isArray(userData.profileTags) ? userData.profileTags.slice(0, 5) : [],
        };
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

  const prepareAvatarChange = (e) => {
    const file = handleAvatarChange(e);

    if (!file) return;

    setAvatarFile(file);
    setPreviewSrc(URL.createObjectURL(file));
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
        avatarFile,
        existingAvatarUrl,
      });

      savedProfile.current = {
        displayName,
        shortAboutMe,
        aboutMe,
        selectedPlatforms,
        selectedGenres,
        profileTags,
      };
      navigate("/profile");
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
            isDirty={isDirty}
            onSave={prepareSave}
            onDiscard={() => navigate("/profile")}
          />
        </div>
      </div>
    </section>
  );
}

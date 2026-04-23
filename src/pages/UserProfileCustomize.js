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
import {
  toggleArrayItem,
  toggleArrayItemWithMax,
} from "../utils/profileCustomization/formHelpers";

import userDefaultProfile from "../assets/images/defaultUser.png";
import "../styles/userProfileCustomize.css";

import ProfilePreviewCard from "../components/userProfileCustomize/ProfilePreviewCard";
import ProfileSettingsForm from "../components/userProfileCustomize/ProfileSettingsForm";

export default function UserProfileCustomizer() {
  const navigate = useNavigate();

  console.log(auth.currentUser.displayName);

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

  const isDirty =
    savedProfile.current !== null &&
    (displayName !== savedProfile.current.displayName ||
      shortAboutMe !== savedProfile.current.shortAboutMe ||
      aboutMe !== savedProfile.current.aboutMe ||
      sortedJson(selectedPlatforms) !==
      sortedJson(savedProfile.current.selectedPlatforms) ||
      sortedJson(selectedGenres) !==
      sortedJson(savedProfile.current.selectedGenres) ||
      sortedJson(profileTags) !==
      sortedJson(savedProfile.current.profileTags) ||
      avatarFile !== null);

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
          selectedPlatforms: Array.isArray(userData.selectedPlatforms)
            ? userData.selectedPlatforms
            : [],
          selectedGenres: Array.isArray(userData.selectedGenres)
            ? userData.selectedGenres
            : [],
          profileTags: Array.isArray(userData.profileTags)
            ? userData.profileTags.slice(0, 5)
            : [],
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
    <section className="profile-settings-shell">
      <div className="profile-settings-shell-header">
        <h1>Customize your profile</h1>
        <div>
          <button onClick={() => navigate("/profile")}>
            ← Back To Profile
          </button>
        </div>
      </div>
      <div className="profile-settings-wrapper">
        <div className="profile-settings-con">
          <section className="identity-con">
            <div className="title">
              <h2>Identity</h2>
              <span>How others see you</span>
            </div>
            <div className="avatar-con">
              <span>Avatar</span>
              <div className="avatar-customization">
                <img src={userDefaultProfile}></img>
                <div>
                  <h3>Profile Picture</h3>
                  <p>PNG, JPG or GIF · Max 4MB Square images work best</p>
                  <button>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Upload Image
                  </button>
                </div>
              </div>
              <div className="profile-banner">
                <span>Profile Banner</span>
                <div>
                  <button className="active" style={{ background: "linear-gradient(135deg,#0f2027,#1a3a2a 40%,#0b2218)" }}></button>
                  <button style={{ background: "linear-gradient(135deg,#1a0a2e,#2d1b4e,#0a1628)" }}></button>
                  <button style={{ background: "linear-gradient(135deg,#1a0a0a,#3a1515,#0a0a1a)" }}></button>
                  <button style={{ background: "linear-gradient(135deg,#0a1a2e,#0d2b4a,#061018)" }}></button>
                  <button style={{ background: "linear-gradient(135deg,#1a1a0a,#2e2a0a,#0a0a05)" }}></button>
                  <button style={{ background: "linear-gradient(135deg,#0a0a1a,#1a0a2e,#050510)" }}></button>
                  <button className="upload-button">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="name-con">
                <div>
                  <div>
                    <span>Display Name</span>
                    <span>Required</span>
                  </div>
                  <input type="text" placeholder="Your display name"></input>
                  <span className="char-count">0/32</span>
                </div>
                <div>
                  <div>
                    <span>Username</span>
                    <span>Required</span>
                  </div>
                  <input type="text" placeholder="Your username"></input>
                </div>
              </div>
              <div className="short-bio-con">
                <div>
                  <span>Short Bio</span>
                  <span>Shown on profile header</span>
                </div>
                <input type="text" placeholder="Tell us about yourself"></input>
                <span className="char-count">0/100</span>
              </div>
              <div className="about-me-con">
                <div>
                  <span>About Me</span>
                  <span>Expanded Description</span>
                </div>
                <textarea placeholder="Tell us about yourself"></textarea>
                <span className="char-count">0/500</span>
              </div>
            </div>
          </section>
          <section className="tags-con">
            <div className="title">
              <h2>Profile Tags</h2>
              <span>Select up to 5 tags</span>
            </div>
            <div className="selected-tags-con">
              <div className="title">
                <span>Selected Tags</span>
                <span>0/5</span>
              </div>
              <div className="selected-tags-list">
                <button>
                  Indie Lover <span>X</span>
                </button>
              </div>
              <input
                className="filter-tags-trigger"
                type="text"
                placeholder="Search tags"
              ></input>
              <div className="tag-results">
                <button className="active">Indie Lover</button>
                <button>RPG Enjoyer</button>
                <button>Backlog Slasher</button>
                <button>Retro Gamer</button>
              </div>
            </div>
          </section>
          <section className="platforms-con">
            <div className="title">
              <h2>Platforms</h2>
              <span>Select all that apply</span>
            </div>
            <div className="selected-platforms-con">
              <div className="title">
                <span>Selected Platforms</span>
              </div>
              <div className="selected-platforms-list">
                <button>
                  PS5 <span>X</span>
                </button>
              </div>
              <input
                className="filter-platforms-trigger"
                type="text"
                placeholder="Search platforms"
              ></input>
              <div className="platform-results">
                <button className="active">PS5</button>
                <button>XBOX Seriex X/S</button>
                <button>Switch</button>
                <button>PC</button>
              </div>
            </div>
          </section>
          <section className="genres-con">
            <div className="title">
              <h2>Favorite Genres</h2>
              <span>Select all that apply</span>
            </div>
            <div className="selected-genres-con">
              <div className="title">
                <span>Selected Genres</span>
              </div>
              <div className="selected-genres-list">
                <button>
                  Action <span>X</span>
                </button>
              </div>
              <input
                className="filter-genres-trigger"
                type="text"
                placeholder="Search genres"
              ></input>
              <div className="genre-results">
                <button className="active">Action</button>
                <button>Adventure</button>
                <button>Horror</button>
                <button>Puzzle</button>
              </div>
            </div>
          </section>
        </div>
        <div className="profile-preview-con">
          <section className="profile-preview">
            <div className="title">
              <h2>Live preview</h2>
              <span>Updates in real-time</span>
            </div>
            <div className="preview-content-con">
              <div className="preview-banner"></div>
              <div className="preview-content">
                <div className="preview-pro-img">
                  <img src={userDefaultProfile}></img>
                </div>
                <div className="preview-pro-content">
                  <div className="preview-name-con">
                    <p>Austin</p>
                    <p>@Juanspotatoes</p>
                  </div>
                  <p>My name is Austin and I'm the main developer of this site and a huge gamer!</p>
                  <div className="preview-tags">
                    <div>Indie Lover</div>
                    <div>Retro Gamer</div>
                    <div>Hardcore Mode</div>
                    <div>Zombie Slayer</div>
                    <div>Platformer Enjoyer</div>
                  </div>
                  <div className="preview-platforms">
                    <span>Platforms</span>
                    <div>
                      <div>PS Vita</div>
                      <div>Xbox Series S/X</div>
                      <div>Nintendo 3DS</div>
                      <div>PC</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="actions-con">
            <span>No changes made</span>
            <div>
              <button>Save Changes</button>
              <button>Discard Changes</button>
            </div>
            <p>Changes are saved to your account and visible to others immediately.</p>
          </section>
        </div>
      </div>
    </section>
    // <section>
    //   <div className="profile-settings-shell">
    //     <header className="profile-settings-header">
    //       <div className="profile-settings-header-title">
    //         <h1>Customize your profile</h1>
    //       </div>

    //       <div className="profile-settings-header-cta">
    //         <Link to="/profile">
    //           <button type="button" className="btn btn-ghost">
    //             Back to profile
    //           </button>
    //         </Link>
    //       </div>
    //     </header>

    //     <div className="profile-settings-grid">
    //       <ProfilePreviewCard
    //         previewSrc={previewSrc}
    //         displayName={displayName}
    //         username={auth.currentUser.displayName}
    //         shortAboutMe={shortAboutMe}
    //         profileTags={profileTags}
    //         selectedPlatforms={selectedPlatforms}
    //         gamesLogged={gamesLogged}
    //         gamesCompleted={gamesCompleted}
    //         onAvatarChange={prepareAvatarChange}
    //       />

    //       <ProfileSettingsForm
    //         displayName={displayName}
    //         setDisplayName={setDisplayName}
    //         shortAboutMe={shortAboutMe}
    //         setShortAboutMe={setShortAboutMe}
    //         aboutMe={aboutMe}
    //         setAboutMe={setAboutMe}
    //         profileTags={profileTags}
    //         onToggleTag={toggleProfileTag}
    //         selectedPlatforms={selectedPlatforms}
    //         onTogglePlatform={togglePlatform}
    //         selectedGenres={selectedGenres}
    //         onToggleGenre={toggleGenre}
    //         openDropdown={openDropdown}
    //         onToggleDropdown={toggleDropdown}
    //         error={error}
    //         saving={saving}
    //         isDirty={isDirty}
    //         onSave={prepareSave}
    //         onDiscard={() => navigate("/profile")}
    //       />
    //     </div>
    //   </div>
    // </section>
  );
}

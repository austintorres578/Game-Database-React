import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,          // 🔹 NEW
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

import Header from "../components/Header.tsx";
import Footer from "../components/Footer.tsx";

import userDefaultProfile from "../assets/images/defaultUser.png";
import "../styles/userProfileCustomize.css";

export default function UserProfileCustomizer() {
  // Avatar preview
  const [previewSrc, setPreviewSrc] = useState(userDefaultProfile);

  // 🔹 Default placeholder values
  const DEFAULT_DISPLAY_NAME = "NewPlayer";
  const DEFAULT_SHORT_BIO = "just a new gamer starting my gaming journey";
  const DEFAULT_ABOUT_ME =
    "Hey there! I just joined and I'm excited to start tracking the games I love.";

  // Profile data (defaults)
  const [displayName, setDisplayName] = useState(DEFAULT_DISPLAY_NAME);
  const [shortAboutMe, setShortAboutMe] = useState(DEFAULT_SHORT_BIO);
  const [aboutMe, setAboutMe] = useState(DEFAULT_ABOUT_ME);

  // 🔹 Username / handle (for @something) – used only for preview
  const [username, setUsername] = useState("");

  // Start with NO active platforms / genres / tags
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [profileTags, setProfileTags] = useState([]);

  // UX: saving + error state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 🔹 Stats for preview (from library)
  const [gamesLogged, setGamesLogged] = useState(0);     // 🔹 NEW
  const [gamesCompleted, setGamesCompleted] = useState(0); // 🔹 NEW

  // 🔹 Load existing profile from Firestore on mount
  useEffect(() => {
    const loadProfileAndStats = async () => {
      const user = auth.currentUser;
      if (!user) return; // not logged in, keep defaults

      try {
        const userDocRef = doc(db, "users", user.uid);
        const snap = await getDoc(userDocRef);

        // base values from auth (fallbacks)
        const fallbackUsername =
          user.displayName ||
          (user.email ? user.email.split("@")[0] : "") ||
          "";

        if (!snap.exists()) {
          // No profile yet → keep defaults but at least fill username once
          setUsername(fallbackUsername);
        } else {
          const data = snap.data();

          setDisplayName(data.displayName || DEFAULT_DISPLAY_NAME);
          setShortAboutMe(data.shortAboutMe || DEFAULT_SHORT_BIO);
          setAboutMe(data.aboutMe || DEFAULT_ABOUT_ME);

          // still load username (for preview only)
          setUsername(data.username || fallbackUsername);

          setSelectedPlatforms(
            Array.isArray(data.selectedPlatforms) ? data.selectedPlatforms : []
          );
          setSelectedGenres(
            Array.isArray(data.selectedGenres) ? data.selectedGenres : []
          );
          setProfileTags(
            Array.isArray(data.profileTags)
              ? data.profileTags.slice(0, 5) // enforce max 5 on load too
              : []
          );

          // ✅ Restore avatar if saved
          if (data.avatarPreview) {
            setPreviewSrc(data.avatarPreview);
          } else {
            setPreviewSrc(userDefaultProfile);
          }
        }

        // 🔹 Also load library stats for preview
        const libraryRef = collection(db, "users", user.uid, "library");
        const librarySnap = await getDocs(libraryRef);
        const games = librarySnap.docs.map((docSnap) => docSnap.data());

        setGamesLogged(games.length);
        setGamesCompleted(
          games.filter((g) => g.status === "completed").length
        );
      } catch (err) {
        console.error("Error loading profile or library stats:", err);
      }
    };

    loadProfileAndStats();
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // This becomes a base64 data URL we can store in Firestore
      setPreviewSrc(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  // Max 5 tags
  const toggleProfileTag = (tag) => {
    setProfileTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 5) return prev;
      return [...prev, tag];
    });
  };

  // Submit handler → save to Firestore (username NOT included)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!displayName.trim() || !shortAboutMe.trim() || !aboutMe.trim()) {
      return; // browser "required" will handle UI
    }

    const user = auth.currentUser;
    if (!user) {
      setError("You must be logged in to save your profile.");
      return;
    }

    const payload = {
      displayName,
      shortAboutMe,
      aboutMe,
      // ❌ username intentionally not saved here
      selectedPlatforms,
      selectedGenres,
      profileTags,
      // ✅ store avatar as data URL
      avatarPreview: previewSrc,
      updatedAt: new Date().toISOString(),
    };

    try {
      setSaving(true);

      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, payload, { merge: true });

      console.log("Profile saved:", payload);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Full Platform List
  const allPlatforms = [
    "All Platforms",
    "Android",
    "Apple II",
    "Atari 2600",
    "Atari 5200",
    "Atari 7800",
    "Atari 8-bit",
    "Atari Flashback",
    "Atari Lynx",
    "Atari ST",
    "Atari XEGS",
    "Classic Macintosh",
    "Commodore / Amiga",
    "Game Boy",
    "Game Boy Advance",
    "Game Boy Color",
    "GameCube",
    "iOS",
    "Linux",
    "macOS",
    "NES",
    "Nintendo 3DS",
    "Nintendo 64",
    "Nintendo DS",
    "Nintendo DSi",
    "Nintendo Switch",
    "PC",
    "PlayStation",
    "PlayStation 2",
    "PlayStation 3",
    "PlayStation 4",
    "PlayStation 5",
    "PS Vita",
    "PSP",
    "SNES",
    "Wii",
    "Wii U",
    "Xbox",
    "Xbox 360",
    "Xbox One",
    "Xbox Series S/X",
  ];

  // Popular genres (static)
  const allGenres = [
    "All Genres",
    "Action",
    "Adventure",
    "RPG",
    "JRPG",
    "Action RPG",
    "Shooter",
    "First-Person Shooter",
    "Third-Person Shooter",
    "Platformer",
    "Fighting",
    "Horror",
    "Survival Horror",
    "Metroidvania",
    "Roguelike",
    "Roguelite",
    "Stealth",
    "Strategy",
    "Tactical",
    "Turn-Based",
    "Real-Time Strategy",
    "MOBA",
    "Puzzle",
    "Rhythm",
    "Simulation",
    "Life Sim",
    "Management",
    "City Builder",
    "Survival",
    "Open World",
    "Sandbox",
    "Racing",
    "Sports",
    "Party",
    "Indie",
    "Visual Novel",
    "MMO",
    "Co-op",
    "Multiplayer",
    "Story-Rich",
  ];

  // Profile tag options
  const allProfileTags = [
    "RPG Enjoyer",
    "Indie Lover",
    "Backlog Slayer",
    "Completionist",
    "Retro Gamer",
    "Collector",
    "Casual Player",
    "Competitive",
    "Story-Driven",
    "Co-op Enjoyer",
    "JRPG Fan",
    "Soulslike Addict",
    "Survival Horror Lover",
    "Open World Explorer",
    "Achievement Hunter",
    "Speedrunner",
    "Min-Maxer",
    "Lore Enthusiast",
    "Retro Enthusiast",
    "Strategy Thinker",
    "Puzzle Solver",
    "Tactical Minded",
    "Solo Player",
    "PVP Focused",
    "Hardcore Mode",
    "Metroidvania Lover",
    "Rogue-like Enthusiast",
    "Hack & Slash Fan",
    "Platformer Enjoyer",
    "Sandbox Enjoyer",
    "Action RPG Fan",
    "Turn-Based Lover",
    "Western RPG Fan",
    "JRPG Enthusiast",
    "Choice-Based Gamer",
    "Fantasy Lover",
    "Sci-Fi Lover",
    "FPS Enjoyer",
    "Third-Person Shooter Fan",
    "Tactical Shooter Fan",
    "Battle Royale Player",
    "Arcade Shooter Lover",
    "Racing Fan",
    "Sim Racer",
    "Driving Game Enthusiast",
    "Builder / Crafter",
    "Life Sim Lover",
    "Management Sim Fan",
    "Psychological Horror Fan",
    "Zombie Slayer",
    "Meta Chaser",
    "Tech Skill Player",
    "Frame Data Nerd",
    "Ranked Mode Regular",
    "Chill Gamer",
    "Late Night Player",
    "Cozy Gamer",
    "Ambient Vibes",
    "Music Lover",
    "Collector of Aesthetics",
  ];

  return (
    <section>
      <Header></Header>
      <div className="profile-settings-shell">
        <header className="profile-settings-header">
          <div className="profile-settings-header-title">
            <h1>Customize your profile</h1>
          </div>

          <div className="profile-settings-header-cta">
            <Link to="/profile"><button className="btn btn-ghost">Back to profile</button></Link>
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
                  onChange={handleAvatarChange}
                  style={{ display: "none" }}
                />

                <div className="profile-status-dot"></div>
              </div>

              <div className="profile-preview-text">
                <div className="profile-name-row">
                  <h2 className="profile-name">{displayName}</h2>
                  <span className="profile-username">
                    @{username || "username"}
                  </span>
                </div>

                {shortAboutMe && (
                  <p className="profile-about-preview">{shortAboutMe}</p>
                )}

                {/* Profile Tags Preview */}
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

            {/* Platforms preview with empty state */}
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

            <form className="settings-form" onSubmit={handleSubmit}>
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

                <div className="chip-group">
                  {allProfileTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={
                        "chip" + (profileTags.includes(tag) ? " chip--active" : "")
                      }
                      onClick={() => toggleProfileTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div className="field-group">
                <div className="field-label-row">
                  <label>Favorite Platforms</label>
                </div>

                <div className="chip-group">
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

              {/* Genres */}
              <div className="field-group">
                <div className="field-label-row">
                  <label>Favorite Genres</label>
                </div>

                <div className="chip-group">
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

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setDisplayName(DEFAULT_DISPLAY_NAME);
                    setShortAboutMe(DEFAULT_SHORT_BIO);
                    setAboutMe(DEFAULT_ABOUT_ME);
                    setSelectedPlatforms([]);
                    setSelectedGenres([]);
                    setProfileTags([]);
                    setPreviewSrc(userDefaultProfile);
                    setError("");
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
      <Footer></Footer>
    </section>
  );
}

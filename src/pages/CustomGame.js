import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import addImageIcon from "../../src/assets/images/add-image-icon.svg";
import "../styles/customGame.css";

import FilterDropdown from "../components/searchPage/FilterDropdown";
import ScreenshotModal from "../components/customGame/ScreenshotModal";
import VideosRow from "../components/customGame/VideosRow";
import VideoModal from "../components/customGame/VideoModal";
import ScreenshotsRowCustom from "../components/customGame/ScreenshotsRowCustom";

import { useScreenshotGallery } from "../hooks/gamePage/useScreenshotGallery";
import { parseVideoUrl } from "../utils/customGame/videoHelpers";
import { useAuth } from "../hooks/useAuth";
import { app } from "../firebase/firebase";
import { saveGameToLibraryFirestore } from "../services/yourLibrary/gameSearchService";

const GENRE_OPTIONS = [
  { id: "action", label: "Action" },
  { id: "adventure", label: "Adventure" },
  { id: "rpg", label: "RPG" },
  { id: "strategy", label: "Strategy" },
  { id: "simulation", label: "Simulation" },
  { id: "sports", label: "Sports" },
  { id: "racing", label: "Racing" },
  { id: "puzzle", label: "Puzzle" },
  { id: "shooter", label: "Shooter" },
  { id: "fighting", label: "Fighting" },
  { id: "horror", label: "Horror" },
  { id: "platformer", label: "Platformer" },
  { id: "indie", label: "Indie" },
  { id: "casual", label: "Casual" },
  { id: "survival", label: "Survival" },
];

const PLATFORM_OPTIONS = [
  { id: "pc", label: "PC" },
  { id: "ps5", label: "PlayStation 5" },
  { id: "ps4", label: "PlayStation 4" },
  { id: "xsx", label: "Xbox Series X/S" },
  { id: "xone", label: "Xbox One" },
  { id: "switch", label: "Nintendo Switch" },
  { id: "ios", label: "iOS" },
  { id: "android", label: "Android" },
  { id: "mac", label: "Mac" },
  { id: "linux", label: "Linux" },
];

const TAG_OPTIONS = [
  { id: "singleplayer", label: "Singleplayer" },
  { id: "multiplayer", label: "Multiplayer" },
  { id: "coop", label: "Co-op" },
  { id: "openworld", label: "Open World" },
  { id: "storyrich", label: "Story Rich" },
  { id: "atmospheric", label: "Atmospheric" },
  { id: "difficult", label: "Difficult" },
  { id: "exploration", label: "Exploration" },
  { id: "fantasy", label: "Fantasy" },
  { id: "scifi", label: "Sci-Fi" },
  { id: "pixelart", label: "Pixel Art" },
  { id: "retro", label: "Retro" },
  { id: "roguelike", label: "Roguelike" },
  { id: "sandbox", label: "Sandbox" },
  { id: "crafting", label: "Crafting" },
  { id: "stealth", label: "Stealth" },
];

export default function CustomGame() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const editState = location.state?.editMode ? location.state : null;
  const gd = editState?.gameData;

  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "success" | "error"
  const [saveError, setSaveError] = useState("");
  const [coverFile, setCoverFile] = useState(null);

  const [formData, setFormData] = useState(() => {
    if (gd) {
      return {
        name: gd.name || "",
        released: gd.released || "",
        metacritic: "",
        rating: "",
        genres: (gd.genres || [])
          .map((g) => (typeof g === "string" ? g : g.name))
          .filter(Boolean),
        platforms: (gd.platforms || [])
          .map((p) =>
            typeof p === "string" ? p : p?.platform?.name || p?.name || "",
          )
          .filter(Boolean),
        shortDescription: gd.shortDescription || "",
        description: gd.description_raw || "",
        coverUrl: gd.background_image || "",
        developer: gd.developers?.[0]?.name || "",
        publisher: gd.publishers?.[0]?.name || "",
        esrbRating: gd.esrb_rating?.name || "",
        tags: (gd.tags || [])
          .map((t) => (typeof t === "string" ? t : t.name))
          .filter(Boolean),
        videos: editState.gameVideos || [],
        screenshots: (editState.gameScreenshots || []).map((s) => ({ id: s.id, image: s.image, storagePath: s.storagePath })),
      };
    }
    return {
      name: "",
      released: "",
      metacritic: "",
      rating: "",
      genres: [],
      platforms: [],
      shortDescription: "",
      description: "",
      coverUrl: "",
      developer: "",
      publisher: "",
      esrbRating: "",
      tags: [],
      videos: [],
      screenshots: [],
    };
  });

  const [showVideoInput, setShowVideoInput] = useState(false);
  const [videoInputVal, setVideoInputVal] = useState("");
  const [videoInputError, setVideoInputError] = useState("");
  const [activeVideoIndex, setActiveVideoIndex] = useState(null);

  const coverFileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCoverFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      const localUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, coverUrl: localUrl }));
    }
  };

  async function handleAddToLibrary() {
    if (!user) {
      navigate("/signin");
      return;
    }
    if (!formData.name.trim()) {
      setSaveError("Please enter a game title.");
      return;
    }

    setSaveStatus("saving");
    setSaveError("");

    try {
      const docId = editState ? editState.docId : `custom_${Date.now()}`;

      const storage = getStorage(app);

      let backgroundImage = formData.coverUrl || "";
      if (coverFile) {
        const coverRef = ref(storage, `users/${user.uid}/customGameCovers/${docId}`);
        await uploadBytes(coverRef, coverFile);
        backgroundImage = await getDownloadURL(coverRef);
      }

      if (editState) {
        const keptPaths = new Set(formData.screenshots.map((s) => s.storagePath).filter(Boolean));
        const removedPaths = (editState.gameScreenshots || [])
          .map((s) => s.storagePath)
          .filter((p) => p && !keptPaths.has(p));
        await Promise.all(
          removedPaths.map((p) => deleteObject(ref(storage, p)).catch(() => {}))
        );
      }

      const savedScreenshots = await Promise.all(
        formData.screenshots.map(async (shot, i) => {
          if (shot.file) {
            const storagePath = `users/${user.uid}/customGameScreenshots/${docId}/${Date.now()}_${i}`;
            const shotRef = ref(storage, storagePath);
            await uploadBytes(shotRef, shot.file);
            const url = await getDownloadURL(shotRef);
            return { id: url, image: url, storagePath };
          }
          return { id: shot.id, image: shot.image, storagePath: shot.storagePath };
        })
      );

      const payload = {
        title: formData.name.trim(),
        rawgId: null,
        slug: null,
        backgroundImage,
        genres: formData.genres,
        platforms: formData.platforms,
        metacritic: null,
        rating: null,
        developer: formData.developer,
        publisher: formData.publisher,
        esrbRating: formData.esrbRating,
        shortDescription: formData.shortDescription,
        description: formData.description,
        tags: formData.tags,
        released: formData.released,
        videos: formData.videos,
        screenshots: savedScreenshots,
        isCustom: true,
        _source: "custom",
        inLibrary: true,
        ...(editState
          ? {}
          : { status: "backlog", addedAt: new Date().toISOString() }),
      };

      await saveGameToLibraryFirestore(user.uid, docId, payload);
      setSaveStatus("success");
      setTimeout(
        () => navigate(editState ? `/game#${docId}` : "/library"),
        1200,
      );
    } catch (err) {
      console.error("Failed to save custom game:", err);
      setSaveError("Failed to save. Please try again.");
      setSaveStatus("error");
    }
  }

  function handleAddVideo() {
    const parsed = parseVideoUrl(videoInputVal);
    if (!parsed) {
      setVideoInputError("Couldn't recognise that URL. Try a YouTube link.");
      return;
    }
    setVideoInputError("");
    setFormData((prev) => ({ ...prev, videos: [...prev.videos, parsed] }));
    setVideoInputVal("");
    setShowVideoInput(false);
  }

  function handleAddScreenshots(newShots) {
    setFormData((prev) => ({
      ...prev,
      screenshots: [...prev.screenshots, ...newShots],
    }));
  }

  function handleDeleteScreenshot(id) {
    setFormData((prev) => ({
      ...prev,
      screenshots: prev.screenshots.filter((s) => s.id !== id),
    }));
  }

  function handleDeleteVideo(index) {
    setFormData((prev) => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index),
    }));
  }

  function handlePrevVideo() {
    setActiveVideoIndex((i) => (i > 0 ? i - 1 : formData.videos.length - 1));
  }

  function handleNextVideo() {
    setActiveVideoIndex((i) => (i < formData.videos.length - 1 ? i + 1 : 0));
  }

  function handleDropdownToggle(e) {
    const parent = e.target.parentNode;
    const filters = parent.querySelector(".filters");
    if (!filters) return;
    const arrow = parent.querySelector("span");
    if (
      arrow.style.transform === "" ||
      arrow.style.transform === "rotate(0deg)"
    ) {
      arrow.style.transform = "rotate(180deg)";
      filters.style.height = "auto";
      parent.querySelector(".toggle").classList.add("active");
    } else {
      arrow.style.transform = "rotate(0deg)";
      filters.style.height = "0px";
      filters.style.marginTop = "0px";
      parent.querySelector(".toggle").classList.remove("active");
    }
  }

  const handleGenreClick = (item) => {
    setFormData((prev) => {
      const genres = prev.genres.includes(item.label)
        ? prev.genres.filter((g) => g !== item.label)
        : [...prev.genres, item.label];
      return { ...prev, genres };
    });
  };

  const handlePlatformClick = (item) => {
    setFormData((prev) => {
      const platforms = prev.platforms.includes(item.label)
        ? prev.platforms.filter((p) => p !== item.label)
        : [...prev.platforms, item.label];
      return { ...prev, platforms };
    });
  };

  const handleTagClick = (item) => {
    setFormData((prev) => {
      const tags = prev.tags.includes(item.label)
        ? prev.tags.filter((t) => t !== item.label)
        : [...prev.tags, item.label];
      return { ...prev, tags };
    });
  };

  const gameScreenshots = formData.screenshots;
  const coverUrl = formData.coverUrl;

  const {
    isFullScreenshotOpen,
    activeScreenshotIndex,
    openScreenshot,
    closeScreenshot,
    showPrevScreenshot,
    showNextScreenshot,
  } = useScreenshotGallery(gameScreenshots);

  return (
    <div className="cg-shell">
      <div className="cg-container">
        <h1>{editState ? "Edit Custom Game" : "Create Custom Game"}</h1>
        {/* HERO SECTION */}
        <section className="cg-hero">
          <div className="cg-cover-wrapper">
            <div
              className="cg-cover loaded cg-cover-clickable"
              onClick={() => coverFileInputRef.current.click()}
              title="Click to upload a cover image"
            >
              <div
                className="cg-cover-img"
                style={{ backgroundImage: `url(${coverUrl})` }}
              >
                {!coverUrl && <img src={addImageIcon} alt="Add Image" />}
              </div>
            </div>
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverFileChange}
              style={{ display: "none" }}
            />
          </div>

          <div className="game-info">
            <div className="cg-title-row">
              <div className="title-con">
                <span className="cg-meta-label">Title</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Game title"
                  className="cg-title"
                />
              </div>
              <div className="year-con">
                <span className="cg-meta-label">Release Year</span>
                <input
                  type="text"
                  name="released"
                  value={formData.released}
                  onChange={handleChange}
                  placeholder="Release year"
                  className="cg-year"
                />
              </div>
            </div>

            <div className="cg-genres">
              <span className="cg-meta-label">Genres</span>
              <FilterDropdown
                summary={
                  formData.genres.length
                    ? formData.genres.join(", ")
                    : "Select Genres"
                }
                hasValue={formData.genres.length > 0}
                filters={GENRE_OPTIONS}
                isActive={(item) => formData.genres.includes(item.label)}
                onItemClick={handleGenreClick}
                filterClassName="genre-filter"
                onToggle={handleDropdownToggle}
              />
            </div>

            <div className="game-platforms">
              <span className="cg-meta-label">Platforms</span>
              <FilterDropdown
                summary={
                  formData.platforms.length
                    ? formData.platforms.join(", ")
                    : "Select Platforms"
                }
                hasValue={formData.platforms.length > 0}
                filters={PLATFORM_OPTIONS}
                isActive={(item) => formData.platforms.includes(item.label)}
                onItemClick={handlePlatformClick}
                filterClassName="platform-filter"
                onToggle={handleDropdownToggle}
              />
            </div>
            <span className="cg-meta-label">Short Description</span>
            <textarea
              name="shortDescription"
              value={formData.shortDescription}
              onChange={handleChange}
              placeholder="Short description..."
              className="cg-short-info"
            />
          </div>
        </section>

        {/* MAIN LAYOUT */}
        <section className="cg-main-layout">
          <article className="game-panel cg-description">
            <h2 className="panel-title">About this game</h2>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Full description..."
            />
          </article>

          <aside className="game-sidebar">
            <div className="game-panel">
              <h2 className="panel-title">Game details</h2>
              <p className="panel-sub">Quick facts at a glance.</p>

              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-label">Release date</span>
                  <input
                    type="date"
                    name="released"
                    value={formData.released}
                    onChange={handleChange}
                    className="stat-value release-date-input"
                  />
                </div>

                <div className="stat-item">
                  <span className="stat-label">Developer</span>
                  <input
                    type="text"
                    name="developer"
                    value={formData.developer}
                    onChange={handleChange}
                    placeholder="Developer name"
                    className="stat-value"
                  />
                </div>

                <div className="stat-item">
                  <span className="stat-label">Publisher</span>
                  <input
                    type="text"
                    name="publisher"
                    value={formData.publisher}
                    onChange={handleChange}
                    placeholder="Publisher name"
                    className="stat-value"
                  />
                </div>

                <div className="stat-item">
                  <span className="stat-label">Age rating</span>
                  <input
                    type="text"
                    name="esrbRating"
                    value={formData.esrbRating}
                    onChange={handleChange}
                    placeholder="e.g. T, M, E"
                    className="stat-value"
                  />
                </div>
              </div>
            </div>

            <div className="game-panel">
              <h2 className="panel-title">Tags</h2>
              <FilterDropdown
                summary={
                  formData.tags.length
                    ? formData.tags.join(", ")
                    : "Select Tags"
                }
                hasValue={formData.tags.length > 0}
                filters={TAG_OPTIONS}
                isActive={(item) => formData.tags.includes(item.label)}
                onItemClick={handleTagClick}
                filterClassName="tag-filter"
                onToggle={handleDropdownToggle}
              />
            </div>
          </aside>
        </section>

        <VideosRow
          videos={formData.videos}
          onDeleteVideo={handleDeleteVideo}
          onOpenVideo={setActiveVideoIndex}
          showInput={showVideoInput}
          setShowInput={setShowVideoInput}
          inputVal={videoInputVal}
          setInputVal={(v) => {
            setVideoInputVal(v);
            setVideoInputError("");
          }}
          inputError={videoInputError}
          onConfirmAdd={handleAddVideo}
        />

        <ScreenshotsRowCustom
          screenshots={gameScreenshots}
          onAddScreenshots={handleAddScreenshots}
          onDeleteScreenshot={handleDeleteScreenshot}
          onOpenScreenshot={openScreenshot}
        />

        <div className="cg-save-bar">
          {!user && (
            <p className="cg-save-hint">
              Sign in to add games to your library.
            </p>
          )}
          <button
            className={`cg-save-btn${saveStatus === "success" ? " success" : ""}`}
            onClick={handleAddToLibrary}
            disabled={saveStatus === "saving" || saveStatus === "success"}
          >
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "success"
                ? editState
                  ? "Changes Saved!"
                  : "Added to Library!"
                : editState
                  ? "Save Changes"
                  : "Add to Library"}
          </button>
          {saveError && <p className="cg-save-error">{saveError}</p>}
        </div>
      </div>

      <VideoModal
        videos={formData.videos}
        activeIndex={activeVideoIndex}
        onClose={() => setActiveVideoIndex(null)}
        onPrev={handlePrevVideo}
        onNext={handleNextVideo}
      />

      <ScreenshotModal
        screenshots={gameScreenshots}
        activeIndex={isFullScreenshotOpen ? activeScreenshotIndex : null}
        onClose={closeScreenshot}
        onPrev={showPrevScreenshot}
        onNext={showNextScreenshot}
      />
    </div>
  );
}

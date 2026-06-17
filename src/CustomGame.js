import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { gamePath } from "../utils/slugify";
import imageCompression from "browser-image-compression";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { getAuth } from "firebase/auth";
import addImageIcon from "../../src/assets/images/add-image-icon.svg";
import placeholderScreenImg from '../../src/assets/images/greenPlaceholder.png';
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
import { allGenres, allPlatforms, allProfileTags } from "../constants/profileTagOptions";
import { fetchRawgTags, searchRawgTags } from "../services/searchPage/rawgService";
import { RevealWrapper } from "../components/RevealWrapper";

const GENRE_OPTIONS = allGenres
  .filter((g) => g !== "All Genres")
  .map((g) => ({ id: g.toLowerCase().replace(/[\s/]+/g, "-"), label: g }));

const PLATFORM_OPTIONS = allPlatforms
  .filter((p) => p !== "All Platforms")
  .map((p) => ({ id: p.toLowerCase().replace(/[\s/]+/g, "-"), label: p }));

const TAG_OPTIONS = allProfileTags.map((t) => ({
  id: t.toLowerCase().replace(/[\s/&]+/g, "-"),
  label: t,
}));

export default function CustomGame() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const editState = location.state?.editMode ? location.state : null;
  const gd = editState?.gameData;

  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "success" | "error"
  const [saveError, setSaveError] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const COMPRESS_OPTS = {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/webp",
  };

  async function compressToWebp(file) {
    try {
      const compressed = await imageCompression(file, COMPRESS_OPTS);
      return new File(
        [compressed],
        file.name.replace(/\.[^.]+$/, "") + ".webp",
        { type: "image/webp" }
      );
    } catch (err) {
      console.error("Compression failed, using original:", err);
      return file;
    }
  }

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
        screenshots: (editState.gameScreenshots || []).map((s) => ({
          id: s.id,
          image: s.image,
          storagePath: s.storagePath,
        })),
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

  const initialFormData = useRef(formData);
  const isDirty =
    coverFile !== null ||
    JSON.stringify(formData) !== JSON.stringify(initialFormData.current);

  const [showVideoInput, setShowVideoInput] = useState(false);
  const [videoInputVal, setVideoInputVal] = useState("");
  const [videoInputError, setVideoInputError] = useState("");
  const [activeVideoIndex, setActiveVideoIndex] = useState(null);

  const [genreSearch, setGenreSearch] = useState("");
  const [showGenreOptions, setShowGenreOptions] = useState(false);

  const [platformSearch, setPlatformSearch] = useState("");
  const [showPlatformOptions, setShowPlatformOptions] = useState(false);

  const [tagSearch, setTagSearch] = useState("");
  const [showTagOptions, setShowTagOptions] = useState(false);
  const [rawgTagOptions, setRawgTagOptions] = useState([]);
  const [isTagSearching, setIsTagSearching] = useState(false);

  useEffect(() => {
    fetchRawgTags().then((tags) => setRawgTagOptions(tags));
  }, []);

  useEffect(() => {
    if (tagSearch.trim().length < 2) {
      setIsTagSearching(false);
      return;
    }
    setIsTagSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchRawgTags(tagSearch);
      setRawgTagOptions((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const newOnes = results.filter((r) => !existingIds.has(r.id));
        return [...prev, ...newOnes];
      });
      setIsTagSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [tagSearch]);

  const MAX_SCREENSHOTS = 6;
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  function validateImageFile(file) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `"${file.name}" isn't a supported image type. Use JPEG, PNG, WebP, or GIF.`;
    }
    if (file.size > MAX_FILE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return `"${file.name}" is ${mb}MB. Images must be under 5MB.`;
    }
    return null;
  }

  const coverFileInputRef = useRef(null);
  const screenshotFileInputRef = useRef(null);

  async function handleScreenshotFileChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const remaining = MAX_SCREENSHOTS - formData.screenshots.length;
    if (remaining <= 0) {
      alert(`Maximum ${MAX_SCREENSHOTS} screenshots allowed.`);
      return;
    }

    const allowed = files.slice(0, remaining);
    if (files.length > remaining) {
      alert(`Only ${remaining} more screenshot(s) can be added. ${files.length - remaining} file(s) were ignored.`);
    }

    const newShots = await Promise.all(
      allowed.map(async (file) => {
        const compressed = await compressToWebp(file);
        const url = URL.createObjectURL(compressed);
        return {
          id: url,
          preview: url,
          image: url,
          file: compressed,
          storagePath: null,
        };
      })
    );

    setFormData((prev) => ({
      ...prev,
      screenshots: [...prev.screenshots, ...newShots],
    }));
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCoverFileChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const compressed = await compressToWebp(file);
    setCoverFile(compressed);
    const localUrl = URL.createObjectURL(compressed);
    setFormData((prev) => ({ ...prev, coverUrl: localUrl }));
  };

  async function handleAddToLibrary() {
    if (!user) {
      // ⚠️ TEMP diagnostic — surface the auth-missing case instead of silent redirect.
      alert(
        "Auth error (diagnostic): no user at save time.\n\n" +
        "useAuth() returned no user — you may have been signed out, or auth hadn't finished loading."
      );
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

      const uploadJobs = [];

      let backgroundImage = formData.coverUrl || "";
      if (coverFile) {
        uploadJobs.push({
          file: coverFile,
          path: `users/${user.uid}/customGameCovers/${docId}`,
          kind: "cover",
        });
      }

      if (editState) {
        const keptPaths = new Set(
          formData.screenshots.map((s) => s.storagePath).filter(Boolean),
        );
        const removedPaths = (editState.gameScreenshots || [])
          .map((s) => s.storagePath)
          .filter((p) => p && !keptPaths.has(p));
        await Promise.all(
          removedPaths.map((p) => deleteObject(ref(storage, p)).catch(() => {})),
        );
      }

      formData.screenshots.forEach((shot, i) => {
        if (shot.file) {
          uploadJobs.push({
            file: shot.file,
            path: `users/${user.uid}/customGameScreenshots/${docId}/${Date.now()}_${i}`,
            kind: "screenshot",
            index: i,
          });
        }
      });

      const totalBytes = uploadJobs.reduce((sum, j) => sum + j.file.size, 0) || 1;
      const transferred = new Array(uploadJobs.length).fill(0);
      setUploadProgress(0);

      const settled = await Promise.allSettled(
        uploadJobs.map(async (job, jobIdx) => {
          const task = uploadBytesResumable(ref(storage, job.path), job.file);
          task.on("state_changed", (snap) => {
            transferred[jobIdx] = snap.bytesTransferred;
            const pct = Math.round(
              (transferred.reduce((a, b) => a + b, 0) / totalBytes) * 100
            );
            setUploadProgress(pct);
          });
          await task;
          const url = await getDownloadURL(task.snapshot.ref);
          return { ...job, url };
        })
      );

      setUploadProgress(100);

      const succeeded = settled
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
      const failed = settled.filter((r) => r.status === "rejected");

      if (failed.length) {
        console.error("Some image uploads failed:", failed.map((f) => f.reason));
      }

      const coverResult = succeeded.find((r) => r.kind === "cover");
      if (coverResult) backgroundImage = coverResult.url;
      const coverFailed = uploadJobs.some((j) => j.kind === "cover") && !coverResult;

      const uploadedByIndex = {};
      succeeded
        .filter((r) => r.kind === "screenshot")
        .forEach((r) => {
          uploadedByIndex[r.index] = { id: r.url, image: r.url, storagePath: r.path };
        });

      const savedScreenshots = formData.screenshots
        .map((shot, i) =>
          shot.file
            ? uploadedByIndex[i] || null
            : { id: shot.id, image: shot.image, storagePath: shot.storagePath }
        )
        .filter(Boolean);

      const failedShotCount =
        uploadJobs.filter((j) => j.kind === "screenshot").length -
        succeeded.filter((r) => r.kind === "screenshot").length;

      if (coverFailed || failedShotCount > 0) {
        const parts = [];
        if (coverFailed) parts.push("the cover image");
        if (failedShotCount > 0) parts.push(`${failedShotCount} screenshot(s)`);
        alert(
          `Saved, but ${parts.join(" and ")} failed to upload. You can edit the game to try again.`
        );
      }

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

      const liveUser = getAuth().currentUser;
      if (!liveUser) {
        alert(
          "Auth error (diagnostic): user present in hook but getAuth().currentUser is null at write time.\n\n" +
          "This points to an auth-state desync or expired session."
        );
        setSaveStatus("error");
        setSaveError("You appear to be signed out. Please sign in again.");
        return;
      }

      await saveGameToLibraryFirestore(user.uid, docId, payload);
      initialFormData.current = formData;
      setCoverFile(null);
      setSaveStatus("success");
      setTimeout(
        () => navigate(editState ? gamePath(docId, formData.name) : "/library"),
        1200,
      );
    } catch (err) {
      console.error("Failed to save custom game:", err);
      // ⚠️ TEMP diagnostic — show the real failure so we can identify the auth error.
      alert(
        "Save failed (diagnostic):\n\n" +
        `code: ${err?.code || "(none)"}\n` +
        `message: ${err?.message || err}\n\n` +
        `Stage: covers/screenshots upload or Firestore write.`
      );
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

        <div className="page-title">
          <div>
            <span className="pre-header"></span>
            <h1>Create Custom Game</h1>
          </div>
          <div>
            <button onClick={() => navigate("/library")}>← Back To Library</button>
          </div>
        </div>

        <RevealWrapper direction="up" delay={100}>
          <section className="custom-hero">
            <div className="left-col">
              <div
                className={`cover-upload-con${formData.coverUrl ? " active" : ""}`}
                onClick={() => coverFileInputRef.current?.click()}
                style={{
                  backgroundImage: formData.coverUrl ? `url(${formData.coverUrl})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  cursor: "pointer",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>

                {!formData.coverUrl && <span>Click to upload cover art</span>}
              </div>
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={handleCoverFileChange}
              />
            </div>
            <div className="right-col">
              <div className="title-input-row">
                <div>
                  <span className="input-label">Game Title</span>
                  <input type="text" placeholder="Game title" name="name" value={formData.name} onChange={handleChange} />
                </div>
                <div>
                  <span className="input-label">Release Year</span>
                  <input type="text" placeholder="Release Year" name="released" value={formData.released} onChange={handleChange} />
                </div>
              </div>

              {/* <div className="dev-row">
                <div>
                  <span className="input-label">Developer</span>
                  <input type="text" placeholder="Developer"></input>
                </div>
                <div>
                  <span className="input-label">Publisher</span>
                  <input type="text" placeholder="Publisher"></input>
                </div>
              </div> */}


              <div className="genre-row">
                <span className="input-label">Genres</span>
                {/* <div className="genre-trigger">
                  <span>Select Genres</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div> */}
                <input
                  className="genre-trigger"
                  placeholder="Search & Select genres..."
                  type="text"
                  value={showGenreOptions ? genreSearch : formData.genres.join(", ")}
                  onChange={(e) => setGenreSearch(e.target.value)}
                  onFocus={() => { setGenreSearch(""); setShowGenreOptions(true); }}
                  onBlur={() => setTimeout(() => setShowGenreOptions(false), 150)}
                />
                {showGenreOptions && (
                  <div className="genre-options">
                    {GENRE_OPTIONS.filter((g) =>
                      g.label.toLowerCase().includes(genreSearch.toLowerCase())
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={formData.genres.includes(item.label) ? "active" : ""}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleGenreClick(item)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="platforms-row">
                <span className="input-label">Platforms</span>
                {/* <div className="platform-trigger">
                  <span>Select Platforms</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div> */}
                <input
                  type="text"
                  className="platform-trigger"
                  placeholder="Search & Select platforms..."
                  value={showPlatformOptions ? platformSearch : formData.platforms.join(", ")}
                  onChange={(e) => setPlatformSearch(e.target.value)}
                  onFocus={() => { setPlatformSearch(""); setShowPlatformOptions(true); }}
                  onBlur={() => setTimeout(() => setShowPlatformOptions(false), 150)}
                />
                {showPlatformOptions && (
                  <div className="platform-options">
                    {PLATFORM_OPTIONS.filter((p) =>
                      p.label.toLowerCase().includes(platformSearch.toLowerCase())
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={formData.platforms.includes(item.label) ? "active" : ""}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handlePlatformClick(item)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>


              <div className="desc-con">
                <span>Description</span>
                <textarea placeholder="Enter a short description" name="description" value={formData.description} onChange={handleChange}></textarea>
              </div>
            </div>
          </section>
        </RevealWrapper>
        <RevealWrapper direction="up" delay={200}>
          <section className="game-details-con">
            <div className="left-col">
              <div className="screenshot-section">
                <div>
                  <div className="title-row">
                    <h3>Screenshots</h3>
                    <button type="button" onClick={() => screenshotFileInputRef.current.click()} disabled={formData.screenshots.length >= MAX_SCREENSHOTS}>+ Add Screenshots {formData.screenshots.length}/{MAX_SCREENSHOTS}</button>
                  </div>
                  <input
                    ref={screenshotFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleScreenshotFileChange}
                    style={{ display: "none" }}
                  />
                  <div className="screenshots">
                    {formData.screenshots.map((shot) => (
                      <div key={shot.id} className="screenshot-press filled-screenshot">
                        <img src={shot.image} alt="screenshot" />
                        <button className="close-button" onClick={(e) => { e.stopPropagation(); handleDeleteScreenshot(shot.id); }}>✕</button>
                      </div>
                    ))}
                    <div className="screenshot-press empty-screenshot" onClick={() => screenshotFileInputRef.current.click()}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                      <span>Add Screenshots</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="right-col">
              <div className="game-details">
                <div className="title-row">
                  <h3>Game Details</h3>
                  <span>Quick facts at a glace</span>
                </div>
                <div className="detail-con">
                  <div className="detail">
                    <span>Release Date</span>
                    <input type="date" name="released" value={formData.released} onChange={handleChange} />
                  </div>
                  <div className="detail">
                    <span>Developer</span>
                    <input type="text" placeholder="Developer name" name="developer" value={formData.developer} onChange={handleChange} />
                  </div>
                  <div className="detail">
                    <span>Publisher</span>
                    <input type="text" placeholder="Publisher name" name="publisher" value={formData.publisher} onChange={handleChange} />
                  </div>
                  <div className="detail">
                    <span>Age Rating</span>
                    <input type="text" placeholder="e.g. E, T, M" name="esrbRating" value={formData.esrbRating} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <div className="tags-con">
                <div className="title-row">
                  <h3>Tags</h3>
                </div>
                <div className="tags">
                  {/* <div className="tag-toggle">
                    <p>Select tags...</p>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></span>
                  </div> */}
                  <input
                    className="tag-toggle"
                    placeholder="Select tags..."
                    type="text"
                    value={showTagOptions ? tagSearch : formData.tags.join(", ")}
                    onChange={(e) => setTagSearch(e.target.value)}
                    onFocus={() => { setTagSearch(""); setShowTagOptions(true); }}
                    onBlur={() => setTimeout(() => setShowTagOptions(false), 150)}
                  />
                  {showTagOptions && (
                    <div className="tag-options">
                      {isTagSearching && <span className="filter-loading">Searching...</span>}
                      {rawgTagOptions
                        .filter((t) => t.label.toLowerCase().includes(tagSearch.toLowerCase()))
                        .map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className={`tag-option ${formData.tags.includes(t.label) ? "selected active" : ""}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleTagClick(t);
                            }}
                          >
                            {t.label}
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </RevealWrapper>
        <RevealWrapper direction="up" delay={300}>
          <section className="video-section">
            <div>
              <div className="title-row">
                <h3>Videos</h3>
                <div>
                  {showVideoInput && (
                    <input
                      type="text"
                      placeholder="Enter Youtube/Video Link"
                      value={videoInputVal}
                      onChange={(e) => setVideoInputVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && videoInputVal.trim()) handleAddVideo(); }}
                    />
                  )}
                  <button
                    className={showVideoInput ? "active" : ""}
                    onClick={() => {
                      if (showVideoInput && videoInputVal.trim()) {
                        handleAddVideo();
                      } else {
                        setShowVideoInput((v) => !v);
                      }
                    }}
                  >
                    {showVideoInput ? "Add Video" : "+ Add Video URL"}
                  </button>
                </div>
              </div>
              <div className="videos">
                {formData.videos.length === 0 ? (
                  <span className="no-video-text">No videos added yet. Paste a YouTube URL above.</span>
                ) : (
                  formData.videos.map((video, i) => (
                    <a key={i} className="video" style={{ backgroundImage: `url(${video.thumbnailUrl})` }} href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noreferrer">
                      <button className="close-button" onClick={(e) => { e.preventDefault(); handleDeleteVideo(i); }}>✕</button>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M3 3.732a1.5 1.5 0 0 1 2.305-1.265l6.706 4.267a1.5 1.5 0 0 1 0 2.531l-6.706 4.268A1.5 1.5 0 0 1 3 12.267V3.732Z" />
                      </svg>
                    </a>
                  ))
                )}
              </div>
            </div>
          </section>
        </RevealWrapper>
        <RevealWrapper direction="up" delay={400}>
          <section className="save-section">
            <span className={isDirty ? "unsaved" : ""}>{isDirty ? "Unsaved changes" : "No changes made"}</span>
            <div>
              <button onClick={() => navigate("/library")}>Cancel</button>
              <button onClick={handleAddToLibrary} disabled={saveStatus === "saving" || saveStatus === "success"}>
                {saveStatus === "saving" ? "Saving..." : saveStatus === "success" ? "Added to Library!" : "Add To Library"}
              </button>
            </div>
            {saveError && <p className="save-error">{saveError}</p>}
          </section>
        </RevealWrapper>
      </div>

      {false && (
        <>
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
                  accept="image/jpeg,image/png,image/webp,image/gif"
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
                      type="number"
                      name="released"
                      value={formData.released}
                      onChange={handleChange}
                      placeholder="Release year"
                      className="cg-year"
                    />
                  </div>
                </div>

                <div className="genre-row">
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
                    // filters={TAG_OPTIONS}
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
        </>
      )}
    </div>
  );
}

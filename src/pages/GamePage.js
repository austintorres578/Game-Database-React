// GamePage.jsx
import { useState, useRef, useLayoutEffect } from "react";
import loadingCircle from "../assets/images/loading.gif";
import editIcon from "../assets/images/edit.png";

import placeholderSvg from "../assets/images/placeholder.svg";
import "../styles/gamePage.css";

import { useNavigate } from "react-router-dom";

import StorePills from "../components/gamePage/StorePills";
import GameHeroActions from "../components/gamePage/GameHeroActions";
import GameDetailsPanel from "../components/gamePage/GameDetailsPanel";
import ScreenshotsRow from "../components/gamePage/ScreenshotsRow";
import ScreenshotModal from "../components/customGame/ScreenshotModal";
import VideoModal from "../components/customGame/VideoModal";

// 🔐 Firebase imports
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayRemove,
  getDoc,
  db,
} from "../firebase/firestore";

import { getLibraryDocId } from "../utils/gamePage/libraryDocId";
import {
  sortStoresByPrice,
  dedupeCombinedStores,
} from "../utils/gamePage/storeUtils";
import {
  removeGameFromAllGroups,
  deleteCustomGameStorageFiles,
} from "../services/gamePage/groupService";

import { RevealWrapper } from "../components/RevealWrapper";
import { useGameData } from "../hooks/gamePage/useGameData";
import { useItadData } from "../hooks/gamePage/useItadData";
import { useRawgStores } from "../hooks/gamePage/useRawgStores";
import { useLibraryState } from "../hooks/gamePage/useLibraryState";
import { useUserGroups } from "../hooks/gamePage/useUserGroups";
import { useCoverImageLoader } from "../hooks/gamePage/useCoverImageLoader";
import { useDraggableScroll } from "../hooks/gamePage/useDraggableScroll";
import { useScreenshotGallery } from "../hooks/gamePage/useScreenshotGallery";

export default function GamePage({ auth }) {
  const navigate = useNavigate();

  // --- Data hooks ---
  const { loading, gameData, gameScreenshots, gameVideos, isCustomGame } =
    useGameData();
  const { itadCoverUrl, itadChecked, itadStores, itadStoresChecked } =
    useItadData(gameData);
  const { rawgStores, rawgStoresChecked } = useRawgStores(gameData);
  const {
    isInLibrary,
    setIsInLibrary,
    isFavorite,
    setIsFavorite,
    isCompleted,
    setIsCompleted,
  } = useLibraryState(auth, gameData);
  const { userGroups, setUserGroups } = useUserGroups(auth, gameData);

  // --- Local UI state ---
  const [savingLibrary, setSavingLibrary] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [savingCompleted, setSavingCompleted] = useState(false);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [savingGroupId, setSavingGroupId] = useState(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const descRef = useRef(null);

  useLayoutEffect(() => {
    const el = descRef.current;
    if (!el) return;
    setDescOverflows(el.scrollHeight > el.clientHeight);
  }, [gameData?.description_raw]);

  function requireAuth(actionLabel) {
    const user = auth.currentUser;
    if (!user) {
      alert(`Please sign in to ${actionLabel}.`);
      navigate("/signin");
      return false;
    }
    return true;
  }

  // Helper: base payload used whenever we create/update a library doc
  function buildBaseGamePayload() {
    if (!gameData) return {};

    if (gameData.isCustom) {
      return {
        title: gameData.name,
        inLibrary: true,
        isCustom: true,
      };
    }

    return {
      id: gameData.id,
      rawgId: gameData.id,

      title: gameData.name,
      slug: gameData.slug || "",

      background_image: gameData.background_image || null,
      backgroundImage: gameData.background_image || null,

      released: gameData.released || null,
      metacritic: gameData.metacritic ?? null,
      rating: gameData.rating ?? null,

      platforms:
        gameData.platforms?.map((p) => p?.platform?.name).filter(Boolean) || [],
      genres: gameData.genres?.map((g) => g?.name).filter(Boolean) || [],

      addedAt: new Date().toISOString(),
      inLibrary: true,
    };
  }

  // ✅ Toggle: add to or remove from LIBRARY (doc existence)
  async function handleToggleLibrary(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!gameData) return;
    if (!requireAuth("manage your library")) return;

    const user = auth.currentUser;
    const docId = getLibraryDocId(gameData.id);
    if (!docId) return;

    const docRef = doc(db, "users", user.uid, "library", docId);

    try {
      setSavingLibrary(true);

      if (isInLibrary) {
        if (gameData.isCustom) {
          await deleteCustomGameStorageFiles(
            user.uid,
            docId,
            gameData.background_image,
            gameData.screenshots || gameScreenshots,
          );
          await deleteDoc(docRef);
        } else {
          await deleteDoc(docRef);
        }

        await removeGameFromAllGroups(user.uid, String(docId));

        setIsInLibrary(false);

        setUserGroups((prev) =>
          prev.map((g) => ({
            ...g,
            gameIds: Array.isArray(g.gameIds)
              ? g.gameIds.filter((id) => String(id) !== String(docId))
              : [],
          })),
        );
      } else {
        await setDoc(
          docRef,
          {
            ...buildBaseGamePayload(),
            status: "backlog",
            isFavorite: false,
          },
          { merge: true },
        );
        setIsInLibrary(true);
      }
    } catch (error) {
      console.error("Error updating library:", error);
      alert("There was a problem updating your library. Please try again.");
    } finally {
      setSavingLibrary(false);
    }
  }

  // 🟢 Toggle COMPLETED (independent of library)
  async function handleToggleCompleted(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!gameData) return;
    if (!requireAuth("mark games as completed")) return;

    const user = auth.currentUser;
    const docId = getLibraryDocId(gameData.id);
    if (!docId) return;

    const completedRef = doc(db, "users", user.uid, "completed", docId);

    try {
      setSavingCompleted(true);

      if (isCompleted) {
        await deleteDoc(completedRef);
        setIsCompleted(false);
      } else {
        await setDoc(completedRef, {
          ...buildBaseGamePayload(),
          inLibrary: false,
          completedAt: new Date().toISOString(),
        });
        setIsCompleted(true);
      }
    } catch (error) {
      console.error("Error updating completed status:", error);
      alert(
        "There was a problem updating your completed games. Please try again.",
      );
    } finally {
      setSavingCompleted(false);
    }
  }

  // ⭐ Toggle favorite (independent of library)
  async function handleToggleFavorite(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!gameData) return;
    if (!requireAuth("favorite games")) return;

    const user = auth.currentUser;
    const docId = getLibraryDocId(gameData.id);
    if (!docId) return;

    const favoriteRef = doc(db, "users", user.uid, "favorites", docId);

    try {
      setSavingFavorite(true);

      if (isFavorite) {
        await deleteDoc(favoriteRef);
        setIsFavorite(false);
      } else {
        await setDoc(favoriteRef, {
          ...buildBaseGamePayload(),
          inLibrary: false,
          favoritedAt: new Date().toISOString(),
        });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Error updating favorite:", error);
      alert("There was a problem updating favorites. Please try again.");
    } finally {
      setSavingFavorite(false);
    }
  }

  // ✅ Toggle a game in/out of a group (click again to remove)
  async function handleToggleGroup(groupId) {
    if (!gameData) return;
    if (!requireAuth("manage groups")) return;

    const user = auth.currentUser;
    const libraryDocId = getLibraryDocId(gameData.id);
    if (!libraryDocId) return;

    const libraryRef = doc(db, "users", user.uid, "library", libraryDocId);
    const groupRef = doc(db, "users", user.uid, "groups", groupId);

    try {
      setSavingGroupId(groupId);

      // Ensure the library doc exists so the group can reference it
      await setDoc(
        libraryRef,
        {
          ...buildBaseGamePayload(),
          status: isCompleted ? "completed" : "backlog",
          isFavorite: !!isFavorite,
        },
        { merge: true },
      );
      setIsInLibrary(true);

      // Read group + compute new list
      const snap = await getDoc(groupRef);
      if (!snap.exists()) {
        console.error("Group not found:", groupId);
        return;
      }

      const data = snap.data();
      const currentIds = Array.isArray(data.gameIds)
        ? data.gameIds.map(String)
        : [];
      const idStr = String(libraryDocId);

      const isAlreadyInGroup = currentIds.includes(idStr);

      if (isAlreadyInGroup) {
        // ✅ remove from group
        await updateDoc(groupRef, {
          gameIds: arrayRemove(idStr),
        });

        // Optimistic UI update
        setUserGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  gameIds: (g.gameIds || []).filter((x) => String(x) !== idStr),
                }
              : g,
          ),
        );
      } else {
        // ✅ add to group (merge without duplicates)
        const updatedIds = [...currentIds, idStr];
        await setDoc(groupRef, { gameIds: updatedIds }, { merge: true });

        // Optimistic UI update
        setUserGroups((prev) =>
          prev.map((g) =>
            g.id === groupId ? { ...g, gameIds: updatedIds } : g,
          ),
        );
      }
    } catch (err) {
      console.error("Error toggling game in group:", err);
      alert("There was a problem updating this group.");
    } finally {
      setSavingGroupId(null);
      setGroupDropdownOpen(false);
    }
  }

  const heroCoverUrl = gameData
    ? isCustomGame
      ? gameData.background_image || placeholderSvg
      : itadCoverUrl
        ? itadCoverUrl
        : !itadChecked
          ? placeholderSvg
          : gameData.background_image || placeholderSvg
    : placeholderSvg;

  const { coverLoaded } = useCoverImageLoader(
    gameData,
    heroCoverUrl,
    placeholderSvg,
  );

  const {
    containerRef: screenshotsRowRef,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    stopDragging,
    handleTouchStart,
    handleTouchMove,
    stopDraggingTouch,
  } = useDraggableScroll();

  const {
    containerRef: videosRowRef,
    isDragging: isVideoDragging,
    handleMouseDown: handleVideoMouseDown,
    handleMouseMove: handleVideoMouseMove,
    stopDragging: stopVideoDragging,
    handleTouchStart: handleVideoTouchStart,
    handleTouchMove: handleVideoTouchMove,
    stopDraggingTouch: stopVideoDraggingTouch,
  } = useDraggableScroll();

  const playableVideos = gameVideos.filter((v) => v.embedUrl);

  function handlePrevVideo() {
    setActiveVideoIndex((i) => (i > 0 ? i - 1 : playableVideos.length - 1));
  }

  function handleNextVideo() {
    setActiveVideoIndex((i) => (i < playableVideos.length - 1 ? i + 1 : 0));
  }

  const {
    isFullScreenshotOpen,
    activeScreenshotIndex,
    openScreenshot,
    closeScreenshot,
    showPrevScreenshot,
    showNextScreenshot,
  } = useScreenshotGallery(gameScreenshots);

  if (!gameData) {
    return (
      <div className="game-page-shell">
        <div className="game-page-container loading-state">
          <img src={loadingCircle} alt="Loading..." />
          <p>Loading Game...</p>
        </div>
      </div>
    );
  }

  // Normalize genres/platforms for rendering (avoids rendering objects)
  const genreNames = Array.isArray(gameData?.genres)
    ? gameData.genres
        .map((g) => (typeof g === "string" ? g : g?.name))
        .filter(Boolean)
    : [];

  const platformNames = Array.isArray(gameData?.platforms)
    ? gameData.platforms
        .map((p) =>
          typeof p === "string" ? p : p?.platform?.name || p?.name || null,
        )
        .filter(Boolean)
    : [];

  // ✅ combine store lists (ITAD offers first, RAWG normalized after)
  const storesChecked = rawgStoresChecked && itadStoresChecked;
  const combinedStores = sortStoresByPrice(
    dedupeCombinedStores([
      ...(Array.isArray(itadStores) ? itadStores : []),
      ...(Array.isArray(rawgStores) ? rawgStores : []),
    ]),
  );

  return (
    <div className="game-page-shell">
      <div className="top-buttons-con">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Go back
        </button>
      </div>
      <div className="game-page-container">
        {/* HERO SECTION */}
        <RevealWrapper direction="up">
        <section className="game-hero">
          <div className="game-hero-con">
            <div className="col-wrapper">
              <div className="left-col">
                <div className="game-art-con">
                  <div className={`game-cover${coverLoaded ? " loaded" : ""}`}>
                    <div
                      className="game-cover-img"
                      style={{ backgroundImage: `url(${heroCoverUrl})` }}
                      title={
                        isCustomGame
                          ? "Custom game cover"
                          : itadCoverUrl
                            ? "Cover source: IsThereAnyDeal"
                            : itadChecked && gameData.background_image
                              ? "Cover source: RAWG"
                              : "Cover source: placeholder"
                      }
                    ></div>
                  </div>
                </div>
                <div className="platform-con">
                  {platformNames.length ? (
                    platformNames.map((name) => <p key={name}>{name}</p>)
                  ) : (
                    <p>Unlisted</p>
                  )}
                </div>
              </div>
              <div className="right-col">
                <div className="genres">
                  {genreNames.length ? (
                    genreNames.map((name) => <p key={name}>{name}</p>)
                  ) : (
                    <p>Unlisted</p>
                  )}
                </div>
                <h1 className="game-title">{gameData.name}</h1>
                <p className="year">{gameData.released?.slice(0, 4)}</p>
                <div className="rating-con">
                  {!isCustomGame && (
                    <>
                      <div>
                        <p className="score">{gameData.metacritic ?? "N/A"}</p>
                        <p className="review-platform">Metacritic</p>
                      </div>
                      <div>
                        <p className="score">{gameData.rating ?? "N/A"} / 5</p>
                        <p className="review-platform">User Score</p>
                      </div>
                    </>
                  )}
                </div>
                <p ref={descRef} className={`game-desc${descExpanded ? " expanded" : ""}`}>
                  {gameData.description_raw || "No description available."}
                </p>
                {descOverflows && (
                  <button className="desc-toggle" onClick={() => setDescExpanded((v) => !v)}>
                    {descExpanded ? "View less" : "View more"}
                  </button>
                )}
                <GameHeroActions
                  gameData={gameData}
                  auth={auth}
                  isInLibrary={isInLibrary}
                  isCompleted={isCompleted}
                  isFavorite={isFavorite}
                  savingLibrary={savingLibrary}
                  savingCompleted={savingCompleted}
                  savingFavorite={savingFavorite}
                  onToggleLibrary={handleToggleLibrary}
                  onToggleCompleted={handleToggleCompleted}
                  onToggleFavorite={handleToggleFavorite}
                  userGroups={userGroups}
                  groupDropdownOpen={groupDropdownOpen}
                  setGroupDropdownOpen={setGroupDropdownOpen}
                  savingGroupId={savingGroupId}
                  onToggleGroup={handleToggleGroup}
                  isCustomGame={isCustomGame}
                />
                {isCustomGame && (
                  <button
                    className="game-edit-button"
                    onClick={() =>
                      navigate("/custom-game", {
                        state: {
                          editMode: true,
                          docId: gameData.id,
                          gameData,
                          gameScreenshots,
                          gameVideos,
                        },
                      })
                    }
                    title="Edit this custom game"
                  >
                    <img src={editIcon} alt="Edit" />
                  </button>
                )}
              </div>
            </div>
            <div className="storefronts">
              <p>Available On</p>
              <StorePills
                storesChecked={storesChecked}
                combinedStores={combinedStores}
              />
            </div>
          </div>
        </section>
        </RevealWrapper>

        {/* MAIN LAYOUT */}
        <RevealWrapper direction="up" delay={100}>
        <section className="game-main-layout">
          <div className="left-col">
            {/* <article className="game-panel game-description">
              <h2 className="panel-title">About this game</h2>
              <p>{gameData.description_raw}</p>
              {!isCustomGame && (
                <div className="digital-stores">
                  <h3>Digital Stores</h3>
                  <p className="digital-store-dis">
                    Store links come from IsThereAnyDeal (when available) and RAWG
                    as a fallback, and may be incomplete. This game may be available
                    on other stores/platforms not listed here.
                  </p>
                  <StorePills storesChecked={storesChecked} combinedStores={combinedStores} />
                </div>
              )}
            </article> */}
            <ScreenshotsRow
              gameScreenshots={gameScreenshots}
              isDragging={isDragging}
              containerRef={screenshotsRowRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={stopDragging}
              onMouseLeave={stopDragging}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={stopDraggingTouch}
              onOpenScreenshot={openScreenshot}
            />
          </div>

          <GameDetailsPanel
            gameData={gameData}
            onTagClick={(tag) =>
              navigate("/search", {
                state: { quickTag: tag.name, quickTagSlug: tag.slug },
              })
            }
          />
        </section>
        </RevealWrapper>

        {playableVideos.length > 0 && (
          <RevealWrapper direction="up" delay={150}>
            <section className="game-screenshots-section">
              <div className="screenshots-header">
                <h2>Videos</h2>
              </div>
              <div
                ref={videosRowRef}
                className={`screenshots-row${isVideoDragging ? " is-dragging" : ""}`}
                onMouseDown={handleVideoMouseDown}
                onMouseMove={handleVideoMouseMove}
                onMouseUp={stopVideoDragging}
                onMouseLeave={stopVideoDragging}
                onTouchStart={handleVideoTouchStart}
                onTouchMove={handleVideoTouchMove}
                onTouchEnd={stopVideoDraggingTouch}
              >
                {playableVideos.map((video, index) => (
                  <div
                    key={video.videoId || index}
                    className="screenshot-card video-card"
                    onClick={() => !isVideoDragging && setActiveVideoIndex(index)}
                  >
                    <div
                      className="screenshot-img video-thumb"
                      style={{ backgroundImage: `url(${video.thumbnailUrl})` }}
                    >
                      <div className="video-play-icon">▶</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </RevealWrapper>
        )}

        <h3>You might also like</h3>
        <div className="related-con">
          <a href="#">
            <div className="related-art"></div>
            <div className="related-content">
              <p className="title">The Witcher 3</p>
              <div className="related-meta">
                <p className="genre">RPG</p>
                <p className="score">97</p>
              </div>
            </div>
          </a>

          <a href="#">
            <div className="related-art"></div>
            <div className="related-content">
              <p className="title">The Witcher 3</p>
              <div className="related-meta">
                <p className="genre">RPG</p>
                <p className="score">97</p>
              </div>
            </div>
          </a>

          <a href="#">
            <div className="related-art"></div>
            <div className="related-content">
              <p className="title">The Witcher 3</p>
              <div className="related-meta">
                <p className="genre">RPG</p>
                <p className="score">97</p>
              </div>
            </div>
          </a>
        </div>
      </div>

      <ScreenshotModal
        screenshots={gameScreenshots}
        activeIndex={isFullScreenshotOpen ? activeScreenshotIndex : null}
        onClose={closeScreenshot}
        onPrev={showPrevScreenshot}
        onNext={showNextScreenshot}
      />

      <VideoModal
        videos={playableVideos}
        activeIndex={activeVideoIndex}
        onClose={() => setActiveVideoIndex(null)}
        onPrev={handlePrevVideo}
        onNext={handleNextVideo}
      />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { loadProfileUserData } from "../services/profile/loadUserData";
import { getPrimaryGenre } from "../utils/userProfile/gameHelpers";
import { useClickOutside } from "../hooks/searchPage/useClickOutside";
import { getPageOptions } from "../utils/searchPage/filterHelpers";

import "../styles/profile.css";

import userDefaultProfileImage from "../assets/images/defaultUser.png";

import ProfileHeaderCard from "../components/userProfile/ProfileHeaderCard";
import FavoriteGamesSection from "../components/userProfile/FavoriteGamesSection";
import ProfileAboutPanel from "../components/userProfile/ProfileAboutPanel";
import LibraryStatsPanel from "../components/userProfile/LibraryStatsPanel";
import CompletedGamesSection from "../components/userProfile/CompletedGamesSection";
import placeholderImage from "../assets/images/greenPlaceholder.png";
import { RevealWrapper } from "../components/RevealWrapper";

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);

  // 🔹 Library / tracked games
  const [libraryGames, setLibraryGames] = useState([]);
  const [completedGames, setCompletedGames] = useState([]);
  const [favoriteGames, setFavoriteGames] = useState([]);

  // 🔹 Pagination for completed games
  const [completedPage, setCompletedPage] = useState(1);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  useClickOutside(dropdownRef, () => setIsPageDropdownOpen(false));

  const COMPLETED_PER_PAGE = 12;

  useEffect(() => {
    const prepareProfileData = loadProfileUserData((data) => {
      setAuthUser(data.user);
      setProfile(data.profile);
      setLibraryGames(data.gameLibrary);
      setCompletedGames(data.completedGames || []);
      setFavoriteGames(data.favoriteGames || []);
      setLoading(data.loading);
    });

    return () => prepareProfileData();
  }, []);

  // Derived values
  const displayName =
    profile?.displayName || authUser?.displayName || "NewPlayer";
  const username = profile?.username || authUser?.displayName || "newuser";
  const shortAboutMe =
    profile?.shortAboutMe || "just a new gamer starting my gaming journey";
  const aboutMe =
    profile?.aboutMe ||
    "Hey there! I just joined and I'm excited to start tracking the games I love.";

  const selectedPlatforms = profile?.selectedPlatforms || [];
  const selectedGenres = profile?.selectedGenres || [];
  const profileTags = profile?.profileTags || [];

  const avatarSrc = profile?.avatarUrl || userDefaultProfileImage;

  // 🔹 Stats
  const totalTracked = libraryGames.length;
  const completedCount = completedGames.length;
  const backlogCount = libraryGames.length;

  const completionRate =
    totalTracked > 0 ? ((completedCount / totalTracked) * 100).toFixed(1) : 0;

  // Pagination
  const totalCompletedPages =
    completedCount > 0 ? Math.ceil(completedCount / COMPLETED_PER_PAGE) : 1;

  const safeCompletedPage = Math.min(completedPage, totalCompletedPages);
  const completedStartIndex = (safeCompletedPage - 1) * COMPLETED_PER_PAGE;
  const completedEndIndex = completedStartIndex + COMPLETED_PER_PAGE;

  const paginatedCompletedGames = completedGames.slice(
    completedStartIndex,
    completedEndIndex,
  );

  useEffect(() => {
    if (completedPage > totalCompletedPages) {
      setCompletedPage(1);
    }
  }, [completedCount, totalCompletedPages, completedPage]);

  if (loading) {
    return (
      <div className="profile-shell">
        <div className="profile profile-loading">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-shell">
      <RevealWrapper direction="up">
      <section className="profile-hero">
        <div
          className="profile-banner"
          style={{
            background: profile?.bannerUrl
              ? `url(${profile.bannerUrl}) center/cover no-repeat`
              : profile?.selectedBanner || 'linear-gradient(135deg,#0f2027,#1a3a2a 40%,#0b2218)',
          }}
        ></div>
          <div className="profile-details">
            <div className="profile-image-con">
              <img src={avatarSrc} alt={displayName} />
            </div>
            <div className="profile-content-con">
              <div className="profile-name">
                <h3 className="display-name">{displayName}</h3>
                <span className="username">@{username}</span>
              </div>
              <p className="short-bio">{shortAboutMe}</p>
              {profileTags.length > 0 && (
                <div className="tags">
                  {profileTags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              )}
              {selectedPlatforms.length > 0 && (
                <div className="platforms-con">
                  <span>Platforms</span>
                  <div className="platforms">
                    {selectedPlatforms.map((platform) => (
                      <span key={platform}>{platform}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <Link to="/profile/customize" className="edit-button">Edit Profile</Link>
      </section>
      </RevealWrapper>
      <section className="about-con">
        <div className="left-col">
          <RevealWrapper direction="up" delay={100}>
          <div className="favorites">
            <div className="title">
              <h2>Favorite Games</h2>
              <span>Click a game to view details</span>
            </div>
            <div className="games">
              {favoriteGames.length === 0 ? (
                <p className="profile-empty-state">No favorite games yet.</p>
              ) : (
                favoriteGames.slice(0, 12).map((game) => (
                  <Link
                    key={game.id}
                    to={`/game#${game.id}`}
                    className="game-con"
                  >
                    <img
                      src={
                        game.background_image ||
                        game.backgroundImage ||
                        placeholderImage
                      }
                      alt={game.title || game.name}
                    />
                    <div className="game-content">
                      <p className="game-title">
                        {game.title || game.name || "Untitled"}
                      </p>
                      <div>
                        <span className="genre">{getPrimaryGenre(game)}</span>
                        <span className="rating">
                          {game.metacritic ?? "N/A"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
          </RevealWrapper>
          <RevealWrapper direction="up" delay={150}>
          <div className="completed-con">
            <div className="title">
              <h2>Completed</h2>
            </div>
            <div className="completed-games">
              {completedGames.length === 0 ? (
                <p className="profile-empty-state">No completed games yet.</p>
              ) : (
                paginatedCompletedGames.map((game) => (
                  <Link
                    key={game.id}
                    to={`/game#${game.id}`}
                    className="completed"
                  >
                    <img
                      src={game.background_image || game.backgroundImage || ""}
                      alt={game.title || game.name}
                    />
                    <div className="completed-content">
                      <p className="title">
                        {game.title || game.name || "Untitled"}
                      </p>
                      <p className="genre">{getPrimaryGenre(game)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
            {completedGames.length > COMPLETED_PER_PAGE && (
              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={safeCompletedPage === 1}
                  onClick={() => setCompletedPage((p) => Math.max(1, p - 1))}
                >
                  ← Prev
                </button>
                <div
                  className={"dropdown" + (isPageDropdownOpen ? " open" : "")}
                  ref={dropdownRef}
                >
                  <button
                    className="dropdown-trigger"
                    type="button"
                    onClick={() => setIsPageDropdownOpen((v) => !v)}
                  >
                    Page {safeCompletedPage} of {totalCompletedPages}{" "}
                    <span className="chevron">▾</span>
                  </button>
                  {isPageDropdownOpen && (
                    <div className="dropdown-menu">
                      {getPageOptions(totalCompletedPages, safeCompletedPage).map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={
                            "dropdown-item" +
                            (n === safeCompletedPage ? " current-page" : "")
                          }
                          onClick={() => {
                            setCompletedPage(n);
                            setIsPageDropdownOpen(false);
                          }}
                        >
                          Page {n}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="page-btn"
                  disabled={safeCompletedPage === totalCompletedPages}
                  onClick={() =>
                    setCompletedPage((p) =>
                      Math.min(totalCompletedPages, p + 1),
                    )
                  }
                >
                  Next →
                </button>
              </div>
            )}
          </div>
          </RevealWrapper>
        </div>

        <div className="right-col">
          <RevealWrapper direction="up" delay={100}>
          <div className="about">
            <div className="title">
              <h2>About</h2>
            </div>
            <p>{aboutMe}</p>
            {selectedGenres.length > 0 && (
              <div className="genres-con">
                <span>Favorite Genres</span>
                <div className="genres">
                  {selectedGenres.map((genre) => (
                    <span key={genre}>{genre}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          </RevealWrapper>
          <RevealWrapper direction="up" delay={150}>
          <div className="library-stats-con">
            <div>
              <h2>Library Stats</h2>
            </div>
            <div className="library-stats">
              <div>
                <h3>{completedCount}</h3>
                <span>Completed</span>
              </div>
              <div>
                <h3>{backlogCount}</h3>
                <span>In Backlog</span>
              </div>
              <div>
                <h3>{totalTracked}</h3>
                <span>Total</span>
              </div>
            </div>
            <div className="completion-rate-con">
              <div className="title">
                <span>Completion Rate</span>
                <span>{completionRate}%</span>
              </div>
              <div className="bar-con">
                <div
                  className="bar-value"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
            </div>
            <div className="top-genres-con">
              <span>Top Genres</span>
              <div className="top-genres">
                <div>
                  <span>Action</span>
                  <div className="genre-bar">
                    <div className="genre-bar-value"></div>
                  </div>
                  <span>29</span>
                </div>
                <div>
                  <span>Action</span>
                  <div className="genre-bar">
                    <div className="genre-bar-value"></div>
                  </div>
                  <span>29</span>
                </div>
                <div>
                  <span>Action</span>
                  <div className="genre-bar">
                    <div className="genre-bar-value"></div>
                  </div>
                  <span>29</span>
                </div>
                <div>
                  <span>Action</span>
                  <div className="genre-bar">
                    <div className="genre-bar-value"></div>
                  </div>
                  <span>29</span>
                </div>
                <div>
                  <span>Action</span>
                  <div className="genre-bar">
                    <div className="genre-bar-value"></div>
                  </div>
                  <span>29</span>
                </div>
              </div>
            </div>
          </div>
          </RevealWrapper>
        </div>
      </section>
    </div>
  );
}

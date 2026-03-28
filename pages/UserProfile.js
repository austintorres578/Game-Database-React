import { useEffect, useState } from "react";

import { loadProfileUserData } from "../services/profile/loadUserData";

import "../styles/profile.css";

import userDefaultProfileImage from "../assets/images/defaultUser.png";

import ProfileHeaderCard from "../components/userProfile/ProfileHeaderCard";
import FavoriteGamesSection from "../components/userProfile/FavoriteGamesSection";
import ProfileAboutPanel from "../components/userProfile/ProfileAboutPanel";
import LibraryStatsPanel from "../components/userProfile/LibraryStatsPanel";
import CompletedGamesSection from "../components/userProfile/CompletedGamesSection";

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);

  // 🔹 Library / tracked games
  const [libraryGames, setLibraryGames] = useState([]);

  // 🔹 Pagination for completed games
  const [completedPage, setCompletedPage] = useState(1);

  const COMPLETED_PER_PAGE = 12;

  useEffect(() => {
    const prepareProfileData = loadProfileUserData((data) => {
      setAuthUser(data.user);
      setProfile(data.profile);
      setLibraryGames(data.gameLibrary);
      setLoading(data.loading);
    });

    return () => prepareProfileData();
  }, []);

  // Derived values
  const displayName = profile?.displayName || authUser?.displayName || "NewPlayer";
  const username = profile?.username || authUser?.displayName || "newuser";
  const shortAboutMe = profile?.shortAboutMe || "just a new gamer starting my gaming journey";
  const aboutMe = profile?.aboutMe || "Hey there! I just joined and I'm excited to start tracking the games I love.";

  const selectedPlatforms = profile?.selectedPlatforms || [];
  const selectedGenres = profile?.selectedGenres || [];
  const profileTags = profile?.profileTags || [];

  const avatarSrc = profile?.avatarPreview || userDefaultProfileImage;

  // 🔹 Stats
  const totalTracked = libraryGames.length;
  const completedGames = libraryGames.filter((g) => g.status === "completed");
  const completedCount = completedGames.length;

  // 🧾 Backlog = everything not completed
  const backlogGames = libraryGames.filter((g) => g.status !== "completed");
  const backlogCount = backlogGames.length;

  // ⭐ Favorites
  const favoriteGames = libraryGames.filter((g) => g.isFavorite);

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
      <div className="profile">
        <ProfileHeaderCard
          displayName={displayName}
          username={username}
          shortAboutMe={shortAboutMe}
          profileTags={profileTags}
          selectedPlatforms={selectedPlatforms}
          totalTracked={totalTracked}
          completedCount={completedCount}
          avatarSrc={avatarSrc}
        />

        <section className="profile-main-grid">
          <FavoriteGamesSection favoriteGames={favoriteGames} />

          <aside className="profile-sidebar">
            <ProfileAboutPanel aboutMe={aboutMe} selectedGenres={selectedGenres} />
            <LibraryStatsPanel completedCount={completedCount} backlogCount={backlogCount} />
          </aside>
        </section>

        <CompletedGamesSection
          completedGames={completedGames}
          paginatedCompletedGames={paginatedCompletedGames}
          completedPerPage={COMPLETED_PER_PAGE}
          safeCompletedPage={safeCompletedPage}
          totalCompletedPages={totalCompletedPages}
          onPageChange={setCompletedPage}
        />
      </div>
    </div>
  );
}

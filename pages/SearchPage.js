import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import loadingCircle from "../assets/images/loading.gif";

import Games from "../components/Games";
import FilterDropdown from "../components/searchPage/FilterDropdown";
import NoResultsMessage from "../components/searchPage/NoResultsMessage";
import SearchPagination from "../components/searchPage/SearchPagination";

import { buildLink } from "../utils/searchPage/buildLink";
import { scrollToTop } from "../utils/searchPage/scrollHelpers";
import { isPlatformActive, isGenreActive, isTagActive, getPageOptions } from "../utils/searchPage/filterHelpers";
import { buildRawgFetchBase, fetchRawgGames, fetchRawgPlatforms, fetchRawgGenres, fetchRawgTags } from "../services/searchPage/rawgService";
import { useClickOutside } from "../hooks/searchPage/useClickOutside";

import "../styles/gameSearch.css";

export default function SearchPage({ user }) {
  const location = useLocation();
  const pageSize = 12;

  const [loading, setLoading] = useState(false);

  const [gatheredData, setGatheredData] = useState([
    { results: [], next: "", previous: "", loaded: false },
  ]);

  const [pageNumber, setPageNumber] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]); // 🔹 NEW

  const [searchTerm, setSearchTerm] = useState("");

  const [platformFilters, setPlatformFilters] = useState([
    { id: "all", label: "All Platforms", platformId: null },
  ]);

  const [genreFilters, setGenreFilters] = useState([
    { id: "all", label: "All Genres", slug: "", kind: "all" },
  ]);

  const [tagFilters, setTagFilters] = useState([
    // 🔹 NEW
    { id: "all", label: "All Tags", slug: "", kind: "all" },
  ]);

  const [sortBy, setSortBy] = useState("-metacritic");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef(null);

  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchLink = buildRawgFetchBase(pageSize);

  const totalPages = Math.max(1, Math.ceil((totalResults || 0) / pageSize));

  // runs the request + stores "last search" meta in localStorage
  function runSearch(link, isFreshSearch = false, metaState) {
    console.log("🔍 RAWG REQUEST URL:", link);

    if (metaState) {
      const { term, platforms = [], genres = [], tags = [], page } = metaState;

      console.log(
        isFreshSearch ? "🔍 NEW / FRESH SEARCH" : "🔁 RE-RUN / RESTORED SEARCH",
      );
      console.log("Search Term:", term || "");

      console.log("Platforms Selected:");
      if (platforms.length === 0) {
        console.log("- (none) -> All Platforms");
      } else {
        platforms.forEach((pid) => {
          const found = platformFilters.find((p) => p.platformId === pid);
          const name = found?.label || "(name not loaded yet)";
          console.log(`- ID: ${pid} | Name: ${name}`);
        });
      }

      console.log("Genres Selected:");
      if (genres.length === 0) {
        console.log("- (none) -> All Genres");
      } else {
        genres.forEach((slug) => {
          const found = genreFilters.find((g) => g.slug === slug);
          const name = found?.label || "(name not loaded yet)";
          console.log(`- Slug: ${slug} | Name: ${name}`);
        });
      }

      console.log("Tags Selected:");
      if (tags.length === 0) {
        console.log("- (none) -> All Tags");
      } else {
        tags.forEach((slug) => {
          const found = tagFilters.find((t) => t.slug === slug);
          const name = found?.label || "(name not loaded yet)";
          console.log(`- Slug: ${slug} | Name: ${name}`);
        });
      }

      console.log("Page:", page);
      console.log("------------------------------------");
    }

    setLoading(true);

    fetchRawgGames(link)
      .then((res) => {
        setLoading(false);
        setTotalResults(res.count);

        localStorage.setItem("currentLink", link);
        if (metaState) {
          localStorage.setItem("searchState", JSON.stringify(metaState));
          if (typeof metaState.page === "number") {
            localStorage.setItem("currentPage", String(metaState.page));
          }
        }

        setGatheredData([
          {
            results: res.results.slice(0, pageSize),
            next: res.next,
            previous: res.previous,
            loaded: true,
          },
        ]);
      })
      .catch((err) => {
        setLoading(false);
        console.error(err);
      });
  }

  // Scroll to top when page loads
  useEffect(() => {
    scrollToTop();
  }, []);

  // fetch platform + genre + tag filters
  useEffect(() => {
    fetchRawgPlatforms().then((platforms) => {
      setPlatformFilters((prev) => [prev[0], ...platforms]);
    });

    fetchRawgGenres().then((genres) => {
      setGenreFilters((prev) => [prev[0], ...genres]);
    });

    fetchRawgTags()
      .then((tags) => {
        setTagFilters((prev) => [prev[0], ...tags]);
      })
      .catch((err) => {
        console.error("Error fetching tags:", err);
      });
  }, []);

  // close page dropdown when clicking outside
  useClickOutside(dropdownRef, () => setIsPageDropdownOpen(false));
  useClickOutside(sortDropdownRef, () => setIsSortDropdownOpen(false));

  // On mount: if there's a saved search, restore it and re-run it
  useEffect(() => {
    const savedLink = localStorage.getItem("currentLink");
    const savedStateRaw = localStorage.getItem("searchState");

    if (savedLink && savedStateRaw) {
      try {
        const savedState = JSON.parse(savedStateRaw);

        setSearchTerm(savedState.term || "");
        setSelectedPlatforms(savedState.platforms || []);
        setSelectedGenres(savedState.genres || []);
        setSelectedTags(savedState.tags || []);
        setPageNumber(savedState.page || 1);
        if (savedState.sortBy) setSortBy(savedState.sortBy);

        runSearch(savedLink, false, savedState);
      } catch (err) {
        console.error("Failed to parse saved searchState", err);
      }
    }
  }, []);

  useEffect(() => {
    const quickTag = location.state?.quickTag;
    const quickTagSlug = location.state?.quickTagSlug;

    if (!quickTag && !quickTagSlug) return;

    // If a slug was passed directly (e.g. from GamePage), use it without
    // needing to wait for or match against the loaded filter lists.
    if (quickTagSlug) {
      const page = 1;
      const nextTags = [quickTagSlug];

      // Ensure the tag exists as a pill in the filter list
      setTagFilters((prev) => {
        const exists = prev.some((t) => t.slug === quickTagSlug);
        if (exists) return prev;
        return [
          ...prev,
          { id: `quick-${quickTagSlug}`, label: quickTag, slug: quickTagSlug, kind: "tag" },
        ];
      });

      setSearchTerm("");
      setSelectedPlatforms([]);
      setSelectedGenres([]);
      setSelectedTags(nextTags);
      setPageNumber(page);
      setIsPageDropdownOpen(false);

      const link = buildLink(fetchLink, "", [], [], nextTags, page, sortBy);

      runSearch(link, true, {
        term: "",
        platforms: [],
        genres: [],
        tags: nextTags,
        page,
        sortBy,
      });

      scrollToTop();
      return;
    }

    // Footer quick-tags: match by label against loaded filters
    if (genreFilters.length <= 1 && tagFilters.length <= 1) return;

    const matchedGenre = genreFilters.find(
      (genre) => genre.label.toLowerCase() === quickTag.toLowerCase(),
    );

    const matchedTag = tagFilters.find(
      (tag) => tag.label.toLowerCase() === quickTag.toLowerCase(),
    );

    const page = 1;

    setSearchTerm("");
    setSelectedPlatforms([]);
    setPageNumber(page);
    setIsPageDropdownOpen(false);

    if (matchedGenre?.slug) {
      const nextGenres = [matchedGenre.slug];

      setSelectedGenres(nextGenres);
      setSelectedTags([]);

      const link = buildLink(fetchLink, "", [], nextGenres, [], page, sortBy);

      runSearch(link, true, {
        term: "",
        platforms: [],
        genres: nextGenres,
        tags: [],
        page,
        sortBy,
      });

      scrollToTop();
      return;
    }

    if (matchedTag?.slug) {
      const nextTags = [matchedTag.slug];

      setSelectedGenres([]);
      setSelectedTags(nextTags);

      const link = buildLink(fetchLink, "", [], [], nextTags, page, sortBy);

      runSearch(link, true, {
        term: "",
        platforms: [],
        genres: [],
        tags: nextTags,
        page,
        sortBy,
      });

      scrollToTop();
    }
  }, [location.state, genreFilters, tagFilters]);

  function handleSubmit(event) {
    event.preventDefault();
    const page = 1;

    setPageNumber(page);
    localStorage.setItem("currentPage", String(page));

    const link = buildLink(
      fetchLink,
      searchTerm,
      selectedPlatforms,
      selectedGenres,
      selectedTags,
      page,
      sortBy,
    );

    runSearch(link, true, {
      term: searchTerm,
      platforms: selectedPlatforms,
      genres: selectedGenres,
      tags: selectedTags,
      page,
      sortBy,
    });

    scrollToTop();
  }

  function nextPage() {
    if (loading || pageNumber >= totalPages) return;

    const newPage = pageNumber + 1;
    const link = buildLink(
      fetchLink,
      searchTerm,
      selectedPlatforms,
      selectedGenres,
      selectedTags,
      newPage,
      sortBy,
    );

    setPageNumber(newPage);
    localStorage.setItem("currentPage", String(newPage));

    runSearch(link, false, {
      term: searchTerm,
      platforms: selectedPlatforms,
      genres: selectedGenres,
      tags: selectedTags,
      page: newPage,
      sortBy,
    });

    scrollToTop();
  }

  function prevPage() {
    if (loading || pageNumber <= 1) return;

    const newPage = pageNumber - 1;
    const link = buildLink(
      fetchLink,
      searchTerm,
      selectedPlatforms,
      selectedGenres,
      selectedTags,
      newPage,
      sortBy,
    );

    setPageNumber(newPage);
    localStorage.setItem("currentPage", String(newPage));

    runSearch(link, false, {
      term: searchTerm,
      platforms: selectedPlatforms,
      genres: selectedGenres,
      tags: selectedTags,
      page: newPage,
      sortBy,
    });

    scrollToTop();
  }

  function goToPage(num) {
    if (loading || num === pageNumber) return;

    const link = buildLink(
      fetchLink,
      searchTerm,
      selectedPlatforms,
      selectedGenres,
      selectedTags,
      num,
      sortBy,
    );

    setPageNumber(num);
    localStorage.setItem("currentPage", String(num));

    runSearch(link, false, {
      term: searchTerm,
      platforms: selectedPlatforms,
      genres: selectedGenres,
      tags: selectedTags,
      page: num,
      sortBy,
    });

    scrollToTop();
  }

  function handleSortChange(nextSort) {
    setSortBy(nextSort);
    setIsSortDropdownOpen(false);
    const page = 1;
    setPageNumber(page);

    const link = buildLink(
      fetchLink,
      searchTerm,
      selectedPlatforms,
      selectedGenres,
      selectedTags,
      page,
      nextSort,
    );

    runSearch(link, false, {
      term: searchTerm,
      platforms: selectedPlatforms,
      genres: selectedGenres,
      tags: selectedTags,
      page,
      sortBy: nextSort,
    });

    scrollToTop();
  }

  function revealSearchDropdown(e) {
    let parent = e.target.parentNode;
    let filters = parent.querySelector(".filters");

    if (!filters) return;

    const arrow = parent.querySelector("span");

    if (
      arrow.style.transform === "" ||
      arrow.style.transform === "rotate(0deg)"
    ) {
      arrow.style.transform = "rotate(180deg)";
      filters.style.height = "100%";
      filters.style.marginTop = "15px";
      parent.querySelector(".toggle").classList.add("active");
    } else {
      arrow.style.transform = "rotate(0deg)";
      filters.style.height = "0px";
      filters.style.marginTop = "0px";
      parent.querySelector(".toggle").classList.remove("active");
    }
  }

  function handlePlatformClick(p) {
    if (p.id === "all") return setSelectedPlatforms([]);

    setSelectedPlatforms((prev) =>
      prev.includes(p.platformId)
        ? prev.filter((id) => id !== p.platformId)
        : [...prev, p.platformId],
    );
  }

  function handleGenreClick(g) {
    if (g.id === "all") return setSelectedGenres([]);

    setSelectedGenres((prev) =>
      prev.includes(g.slug)
        ? prev.filter((sl) => sl !== g.slug)
        : [...prev, g.slug],
    );
  }

  // 🔹 Tag click handler
  function handleTagClick(t) {
    if (t.id === "all") return setSelectedTags([]);

    setSelectedTags((prev) =>
      prev.includes(t.slug)
        ? prev.filter((sl) => sl !== t.slug)
        : [...prev, t.slug],
    );
  }

  function resetSearch() {
    setSearchTerm("");
    setSelectedPlatforms([]);
    setSelectedGenres([]);
    setSelectedTags([]);
    setSortBy("-metacritic");
    setPageNumber(1);
    setIsPageDropdownOpen(false);
    setIsSortDropdownOpen(false);

    setGatheredData([{ results: [], next: "", previous: "", loaded: false }]);
    setTotalResults(0);
    localStorage.removeItem("currentLink");
    localStorage.removeItem("searchState");
    localStorage.removeItem("currentPage");

    scrollToTop();
  }

  const games = gatheredData[0].results.map((game) => (
    <Games
      key={game.id}
      user={user} // ✅ IMPORTANT: Games can now block “Add to Library” when logged out
      id={game.id}
      name={game.name}
      rating={game.metacritic}      rawgRating={game.rating}      developers={game.developers}
      genre={game.genres}
      background={game.background_image}
      consoleList={game.platforms}
      pageNumber={pageNumber}
      esrb_rating={game.esrb_rating}
      tag={game.tags}
      stores={game.stores}
    />
  ));


  // selected platforms/genres/tags summary
  const selectedPlatformLabels = platformFilters
    .filter((p) => p.id !== "all" && selectedPlatforms.includes(p.platformId))
    .map((p) => p.label);

  const platformSummary =
    selectedPlatformLabels.length === 0
      ? "All Platforms"
      : selectedPlatformLabels.join(", ");

  const selectedGenreLabels = genreFilters
    .filter((g) => g.id !== "all" && selectedGenres.includes(g.slug))
    .map((g) => g.label);

  const genreSummary =
    selectedGenreLabels.length === 0
      ? "All Genres"
      : selectedGenreLabels.join(", ");

  const selectedTagLabels = tagFilters
    .filter((t) => t.id !== "all" && selectedTags.includes(t.slug))
    .map((t) => t.label);

  const tagSummary =
    selectedTagLabels.length === 0 ? "All Tags" : selectedTagLabels.join(", ");

  const pageOptions = getPageOptions(totalPages, pageNumber);

  function getSortLabel(value) {
    switch (value) {
      case "metacritic":  return "Metacritic (Low-High)";
      case "-rating":     return "RAWG (High-Low)";
      case "rating":      return "RAWG (Low-High)";
      case "name":        return "Name (A-Z)";
      case "-name":       return "Name (Z-A)";
      case "-metacritic":
      default:            return "Metacritic (High-Low)";
    }
  }

  const hasResults =
    gatheredData[0].loaded && gatheredData[0].results.length > 0;
  const noResults =
    gatheredData[0].loaded && !loading && gatheredData[0].results.length === 0;

  return (
    <div className="search-container">

      <div className="search-header">
        <h1 className="search-title">Find Your Next Game</h1>
        <p className="search-subtitle">
          Search thousands of titles across all platforms.
        </p>
      </div>

      <div className="search-page-container">
        <form onSubmit={handleSubmit}>
          <div className="search-box-wrapper">
            <input
              className="search-box"
              type="text"
              placeholder="Search By Game Title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="search-button" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {/* PLATFORMS */}
          <FilterDropdown
            summary={platformSummary}
            hasValue={selectedPlatforms.length > 0}
            filters={platformFilters}
            isActive={(p) => isPlatformActive(p, selectedPlatforms)}
            onItemClick={handlePlatformClick}
            filterClassName="platform-filter"
            onToggle={revealSearchDropdown}
          />

          {/* GENRES */}
          <FilterDropdown
            summary={genreSummary}
            hasValue={selectedGenres.length > 0}
            filters={genreFilters}
            isActive={(g) => isGenreActive(g, selectedGenres)}
            onItemClick={handleGenreClick}
            filterClassName="genre-filter"
            onToggle={revealSearchDropdown}
          />

          {/* TAGS */}
          <FilterDropdown
            summary={tagSummary}
            hasValue={selectedTags.length > 0}
            filters={tagFilters}
            isActive={(t) => isTagActive(t, selectedTags)}
            onItemClick={handleTagClick}
            filterClassName="tag-filter"
            onToggle={revealSearchDropdown}
          />

          <button
            type="button"
            className="reset-search-button"
            onClick={resetSearch}
          >
            Reset Search
          </button>
        </form>

        {/* SORT */}
        {hasResults && <div className="search-sort-con" ref={sortDropdownRef}>
          <p>Sort by</p>
          <div className="sorting">
            <button type="button" onClick={() => setIsSortDropdownOpen((prev) => !prev)}>
              {getSortLabel(sortBy)}
            </button>
            <div className={isSortDropdownOpen ? "" : "invisible"}>
              {[
                { key: "-metacritic", label: "Metacritic (High-Low)" },
                { key: "metacritic",  label: "Metacritic (Low-High)" },
                { key: "-rating",     label: "RAWG (High-Low)" },
                { key: "rating",      label: "RAWG (Low-High)" },
                { key: "name",        label: "Name (A-Z)" },
                { key: "-name",       label: "Name (Z-A)" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={sortBy === key ? "active" : ""}
                  onClick={() => handleSortChange(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>}

        {loading && (
          <div className="loading-wrapper">
            <img src={loadingCircle} alt="Loading..." />
            <p>Searching For Games...</p>
          </div>
        )}

        {hasResults && <div className="game-grid">{games}</div>}

        {noResults && <NoResultsMessage />}

        {gatheredData[0].loaded && totalPages > 1 && hasResults && (
          <SearchPagination
            pageNumber={pageNumber}
            totalPages={totalPages}
            pageOptions={pageOptions}
            isPageDropdownOpen={isPageDropdownOpen}
            setIsPageDropdownOpen={setIsPageDropdownOpen}
            dropdownRef={dropdownRef}
            loading={loading}
            onPrevPage={prevPage}
            onNextPage={nextPage}
            onGoToPage={goToPage}
          />
        )}
      </div>

    </div>
  );
}

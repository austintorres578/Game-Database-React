import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import loadingCircle from "../assets/images/loading.gif";

import Games from "../components/Games";
import NoResultsMessage from "../components/searchPage/NoResultsMessage";
import SearchPagination from "../components/searchPage/SearchPagination";

import { buildLink } from "../utils/searchPage/buildLink";
import { scrollToTop } from "../utils/searchPage/scrollHelpers";
import { isPlatformActive, isGenreActive, isTagActive, getPageOptions } from "../utils/searchPage/filterHelpers";
import { buildRawgFetchBase, fetchRawgGames, fetchRawgPlatforms, fetchRawgGenres, fetchRawgTags } from "../services/searchPage/rawgService";
import { useClickOutside } from "../hooks/searchPage/useClickOutside";
import { RevealWrapper } from "../components/RevealWrapper";

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
  const [selectedTags, setSelectedTags] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [platformFilters, setPlatformFilters] = useState([
    { id: "all", label: "All Platforms", platformId: null },
  ]);

  const [genreFilters, setGenreFilters] = useState([
    { id: "all", label: "All Genres", slug: "", kind: "all" },
  ]);

  const [tagFilters, setTagFilters] = useState([
    { id: "all", label: "All Tags", slug: "", kind: "all" },
  ]);

  const [sortBy, setSortBy] = useState("-metacritic");

  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [activeFilterCategory, setActiveFilterCategory] = useState(null);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const filterAreaRef = useRef(null);
  useClickOutside(filterAreaRef, () => setActiveFilterCategory(null));

  const fetchLink = buildRawgFetchBase(pageSize);

  const totalPages = Math.max(1, Math.ceil((totalResults || 0) / pageSize));

  // runs the request + stores "last search" meta in localStorage
  function runSearch(link, metaState) {
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
    Promise.all([
      fetchRawgPlatforms().then((platforms) => {
        setPlatformFilters((prev) => [prev[0], ...platforms]);
      }),
      fetchRawgGenres().then((genres) => {
        setGenreFilters((prev) => [prev[0], ...genres]);
      }),
      fetchRawgTags().then((tags) => {
        setTagFilters((prev) => [prev[0], ...tags]);
      }),
    ])
      .catch((err) => console.error("Error fetching filters:", err))
      .finally(() => setFiltersLoading(false));
  }, []);

  // close page dropdown when clicking outside
  useClickOutside(dropdownRef, () => setIsPageDropdownOpen(false));

  // On mount: if there's a saved search, restore it and re-run it
  useEffect(() => {
    if (location.state?.headerSearch) return;

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

        runSearch(savedLink, savedState);
      } catch (err) {
        console.error("Failed to parse saved searchState", err);
      }
    }
  }, []);

  useEffect(() => {
    const term = location.state?.headerSearch;
    if (!term) return;

    const page = 1;
    setSearchTerm(term);
    setSelectedPlatforms([]);
    setSelectedGenres([]);
    setSelectedTags([]);
    setPageNumber(page);

    const link = buildLink(fetchLink, term, [], [], [], page, sortBy);
    runSearch(link, { term, platforms: [], genres: [], tags: [], page, sortBy });
    scrollToTop();
  }, [location.state?.headerSearch]);

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

      runSearch(link, {
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

      runSearch(link, {
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

      runSearch(link, {
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

    runSearch(link, {
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

    runSearch(link, {
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

    runSearch(link, {
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

    runSearch(link, {
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

    runSearch(link, {
      term: searchTerm,
      platforms: selectedPlatforms,
      genres: selectedGenres,
      tags: selectedTags,
      page,
      sortBy: nextSort,
    });

    scrollToTop();
  }

  function makeFilterToggler(setter, getKey) {
    return (item) => {
      if (item.id === "all") return setter([]);
      const key = getKey(item);
      setter((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
    };
  }

  const handlePlatformClick = makeFilterToggler(setSelectedPlatforms, (p) => p.platformId);
  const handleGenreClick    = makeFilterToggler(setSelectedGenres,    (g) => g.slug);
  const handleTagClick      = makeFilterToggler(setSelectedTags,      (t) => t.slug);

  function resetSearch() {
    setSearchTerm("");
    setSelectedPlatforms([]);
    setSelectedGenres([]);
    setSelectedTags([]);
    setSortBy("-metacritic");
    setPageNumber(1);
    setIsPageDropdownOpen(false);
    setActiveFilterCategory(null);

    setGatheredData([{ results: [], next: "", previous: "", loaded: false }]);
    setTotalResults(0);
    localStorage.removeItem("currentLink");
    localStorage.removeItem("searchState");
    localStorage.removeItem("currentPage");

    scrollToTop();
  }

  const games = gatheredData[0].results.map((game, index) => (
    <Games
      key={game.id}
      index={index}
      user={user}
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
      released={game.released}
    />
  ));


  const pageOptions = getPageOptions(totalPages, pageNumber);


  const hasResults =
    gatheredData[0].loaded && gatheredData[0].results.length > 0;
  const noResults =
    gatheredData[0].loaded && !loading && gatheredData[0].results.length === 0;

  return (
    <div className="search-container">

      <RevealWrapper direction="up">
        
        {/*  
        <div className="search-header">
          <h1 className="search-title">Find Your Next Game</h1>
          <p className="search-subtitle">
            Search thousands of titles across all platforms.
          </p>
        </div>
        */}
        
      </RevealWrapper>

      <div className="search-page-container">
        <RevealWrapper direction="up" delay={100}>
        <form onSubmit={handleSubmit}>
          <div className="search-box-wrapper">
            <svg class="search-icon" viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.5"></circle><path d="M13 13l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>
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

          <div ref={filterAreaRef} style={{ position: "relative" }}>
            <div className="platform-flex">
              <button
                type="button"
                className={`filter-category-btn${selectedPlatforms.length > 0 ? " has-value" : ""}${activeFilterCategory === "platform" ? " open" : ""}`}
                onClick={() => setActiveFilterCategory((prev) => prev === "platform" ? null : "platform")}
              >
                Platforms <span className="filter-count-badge">{selectedPlatforms.length > 0 ? selectedPlatforms.length : "All"}</span> <span className="chevron">▾</span>
              </button>

              <button
                type="button"
                className={`filter-category-btn${selectedGenres.length > 0 ? " has-value" : ""}${activeFilterCategory === "genre" ? " open" : ""}`}
                onClick={() => setActiveFilterCategory((prev) => prev === "genre" ? null : "genre")}
              >
                Genres <span className="filter-count-badge">{selectedGenres.length > 0 ? selectedGenres.length : "All"}</span> <span className="chevron">▾</span>
              </button>

              <button
                type="button"
                className={`filter-category-btn${selectedTags.length > 0 ? " has-value" : ""}${activeFilterCategory === "tag" ? " open" : ""}`}
                onClick={() => setActiveFilterCategory((prev) => prev === "tag" ? null : "tag")}
              >
                Tags <span className="filter-count-badge">{selectedTags.length > 0 ? selectedTags.length : "All"}</span> <span className="chevron">▾</span>
              </button>

              <button
                type="button"
                className="reset-search-button"
                onClick={resetSearch}
              >
                Reset Search
              </button>
            </div>

            {activeFilterCategory && (() => {
              const { filters, isActive, onClick } =
                activeFilterCategory === "platform"
                  ? { filters: platformFilters, isActive: (i) => isPlatformActive(i, selectedPlatforms), onClick: handlePlatformClick }
                  : activeFilterCategory === "genre"
                  ? { filters: genreFilters,    isActive: (i) => isGenreActive(i, selectedGenres),       onClick: handleGenreClick }
                  : { filters: tagFilters,      isActive: (i) => isTagActive(i, selectedTags),           onClick: handleTagClick };
              return (
                <div className="filter-pill-container">
                  {filtersLoading && <span className="filter-loading">Loading filters...</span>}
                  {filters.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={isActive(item) ? "active" : ""}
                      onClick={() => onClick(item)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        </form>
        </RevealWrapper>

        {loading && (
          <div className="loading-wrapper">
            <img src={loadingCircle} alt="Loading..." />
            <p>Searching For Games...</p>
          </div>
        )}

        {hasResults && (
          <RevealWrapper direction="up">
            <div className="pagination-info">
              <p><strong>{totalResults}</strong> games found</p>
              <p>Page {pageNumber} of {totalPages}</p>
            </div>
          </RevealWrapper>
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

import { useState } from "react";
import placeholderImg from "../../assets/images/greenPlaceholder.png";

import "../../styles/yourLibrary.css";

export default function YourLibraryMobile() {
  const [viewMode, setViewMode] = useState("row");

  return (
    <main className="mobile-library">
      <section className="mobile-library-hero">
        <div className="top-row">
          <div>
            <span>Your Library</span>
            <h1>Game Library</h1>
          </div>
          <div className="mobile-library-stats">
            <div>
              <h3>0</h3>
              <p>Games</p>
            </div>
            <div>
              <h3>0</h3>
              <p>Completed</p>
            </div>
            <div>
              <h3>0</h3>
              <p>Playing</p>
            </div>
          </div>
        </div>
        <div className="bottom-row">
          <div>
            <button className="search-button">Search For Game</button>
          </div>
          <div>
            <button className="upload-button action">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </button>
            <button className="add-button action">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </section>
      <section className="library-pills">
        <button className="active">
          All <span>0</span>
        </button>
        <button>
          All <span>0</span>
        </button>
        <button>
          All <span>0</span>
        </button>
        <button>
          All <span>0</span>
        </button>
      </section>
      <section className="mobile-search-container">
        <input type="text" placeholder="Search your library"></input>
        <button className="sort-button">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
            <line x1="11" y1="18" x2="13" y2="18"></line>
          </svg>
        </button>
      </section>
      <section className="grid-info">
        <p>
          Showing <strong>30</strong> games
        </p>
        <div>
          <button className={viewMode === "row" ? "active" : ""} onClick={() => setViewMode("row")}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
            </svg>
          </button>
        </div>
      </section>
      <section className={`game-grid${viewMode === "grid" ? " grid-view" : ""}`}>
        {/* <a href="#" className="row">
          <img src={placeholderImg}></img>
          <div>
            <h4>Game Name</h4>
            <div>
              <span className="genre">Genre</span>
              <span className="group">Group</span>
            </div>
          </div>
        </a> */}
        {/* <a href="#" className="row">
          <img src={placeholderImg}></img>
          <div>
            <h4>Game Name</h4>
            <div>
              <span className="genre">Genre</span>
              <span className="group">Group</span>
            </div>
          </div>
        </a> */}
        <a href="#" className={viewMode}>
          <img src={placeholderImg}></img>
          <div>
            <h4>Game Name</h4>
            <div>
              <span className="genre">Genre</span>
              <span className="group">Group</span>
            </div>
          </div>
          <span className="rating">99</span>
        </a>
        <a href="#" className={viewMode}>
          <img src={placeholderImg}></img>
          <div>
            <h4>Game Name</h4>
            <div>
              <span className="genre">Genre</span>
              <span className="group">Group</span>
            </div>
          </div>
          <span className="rating">99</span>
        </a>
        <a href="#" className={viewMode}>
          <img src={placeholderImg}></img>
          <div>
            <h4>Game Name</h4>
            <div>
              <span className="genre">Genre</span>
              <span className="group">Group</span>
            </div>
          </div>
          <span className="rating">99</span>
        </a>
        <a href="#" className={viewMode}>
          <img src={placeholderImg}></img>
          <div>
            <h4>Game Name</h4>
            <div>
              <span className="genre">Genre</span>
              <span className="group">Group</span>
            </div>
          </div>
          <span className="rating">99</span>
        </a>
        <a href="#" className={viewMode}>
          <img src={placeholderImg}></img>
          <div>
            <h4>Game Name</h4>
            <div>
              <span className="genre">Genre</span>
              <span className="group">Group</span>
            </div>
          </div>
          <span className="rating">99</span>
        </a>
      </section>
    </main>
  );
}

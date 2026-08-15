import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gamePath } from "../utils/slugify";

import baldurCover from '../assets/images/baldurCover.jpg'
import redDeadCover from '../assets/images/redDeadCover.jpg'
import animalCrossingCover from '../assets/images/animalCrossingCover.jpg'

import gamePreviewImage from '../assets/images/redDeadPreview.jpeg'

import { ReactComponent as Arrow } from '../assets/images/arrow.svg'

import "../styles/home.css";

export default function HomePage({ user }) {
  const statGridRef = useRef(null);
  const statCounterRef = useRef(null);
  const headersRef = useRef(null);
  const headerConRef = useRef(null);
  const carouselIndexRef = useRef(0);
  const scrollRelRef = useRef(null);
  const featureIndexRef = useRef(0);
  const featureStepRef = useRef(null);
  useEffect(() => {
    const animateCounter = (el) => {
      const target = +el.dataset.target;
      const suffix = el.dataset.suffix || '';
      const duration = 2000;
      const step = target / (duration / 16);
      let current = 0;

      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          el.textContent = target.toLocaleString() + suffix;
          clearInterval(timer);
        } else {
          el.textContent = Math.floor(current).toLocaleString() + suffix;
        }
      }, 16);
    };

    const observers = [];

    [statGridRef, statCounterRef].forEach((ref) => {
      const el = ref.current;
      if (!el) return;

      const counters = el.querySelectorAll('h3[data-target]');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            counters.forEach(animateCounter);
            observer.disconnect();
          }
        });
      }, { threshold: 0.3 });

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  useEffect(() => {
    const headersEl = headersRef.current;
    if (!headersEl) return;

    const interval = setInterval(() => {
      const h1s = headersEl.querySelectorAll('h1');
      if (h1s.length === 0) return;

      const nextIndex = (carouselIndexRef.current + 1) % h1s.length;

      if (nextIndex === 0) {
        headersEl.style.top = '0px';
        h1s.forEach(h => { h.style.opacity = '1'; });
      } else {
        const currentTop = parseFloat(headersEl.style.top) || 0;
        headersEl.style.top = `${currentTop - h1s[carouselIndexRef.current].offsetHeight}px`;
        h1s[carouselIndexRef.current].style.opacity = '0';
      }

      carouselIndexRef.current = nextIndex;
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const headersEl = headersRef.current;
    const headerConEl = headerConRef.current;
    if (!headersEl || !headerConEl) return;

    const firstH1 = headersEl.querySelector('h1');
    if (!firstH1) return;

    const syncHeight = () => {
      headerConEl.style.height = `${firstH1.offsetHeight}px`;
    };

    syncHeight();

    const observer = new ResizeObserver(syncHeight);
    observer.observe(firstH1);

    const resetCarousel = () => {
      headersEl.style.top = '0px';
      headersEl.querySelectorAll('h1').forEach(h => { h.style.opacity = '1'; });
      carouselIndexRef.current = 0;
      syncHeight();
    };

    window.addEventListener('resize', resetCarousel);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resetCarousel);
    };
  }, []);

  useEffect(() => {
    const el = scrollRelRef.current;
    if (!el) return;

    const INTERVAL_MS = 5000;
    const MOBILE_QUERY = "(max-width: 765px)";

    let interval = null;

    const mql = window.matchMedia(MOBILE_QUERY);

    const reset = () => {
      featureIndexRef.current = 0;
      el.style.left = "0px";
    };

    const move = (direction) => {
      const cards = el.querySelectorAll(".feature-card");
      if (cards.length === 0) return;

      // Read the actual rendered gap so JS and CSS can't drift apart.
      const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
      const step = cards[0].getBoundingClientRect().width + gap;
      const count = cards.length;
      const nextIndex = (featureIndexRef.current + direction + count) % count;

      el.style.left = nextIndex === 0 ? "0px" : `${-nextIndex * step}px`;
      featureIndexRef.current = nextIndex;
    };

    const advance = () => move(1);

    const restart = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(advance, INTERVAL_MS);
    };

    featureStepRef.current = (direction) => {
      if (!mql.matches) return;
      move(direction);
      restart();
    };

    const start = () => {
      if (interval) return;
      interval = setInterval(advance, INTERVAL_MS);
    };

    const stop = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
      reset();
    };

    const sync = () => {
      if (mql.matches) {
        reset();   // realign to card 0 at the new size
        start();
      } else {
        stop();
      }
    };

    const handleResize = () => {
      reset();
      if (!mql.matches) return;
      restart();
    };

    sync();
    mql.addEventListener("change", sync);
    window.addEventListener("resize", handleResize);

    return () => {
      mql.removeEventListener("change", sync);
      window.removeEventListener("resize", handleResize);
      featureStepRef.current = null;
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-glow hero-glow-1"></div>
        <div className="hero-glow hero-glow-2"></div>
        <div className="hero-noise"></div>
        <div className="home-hero-wrapper">
          <div className="home-hero-inner">
            <p className="home-kicker">Video Game Backlog Tracker</p>
            <div className="header-con" ref={headerConRef}>
              <div className="headers" ref={headersRef}>
                <h1>Find your next<br></br> game to play.</h1>
                <h1>Import your <br></br>library in minutes.</h1>
                <h1>Group games <br></br>your way.</h1>
              </div>
            </div>
            <p className="home-subtitle">
              Search 500,000+ titles across every platform. Track your backlog,
              rate what you've finished, and never lose your place in a series
              again.
            </p>

            <div className="home-hero-actions">
              <Link to="/search" className="btn btn-primary">
                Start Searching
              </Link>

              {user ? (
                <Link to="/profile" className="btn btn-ghost">
                  View Profile
                </Link>
              ) : (
                <Link to="/signup" className="btn btn-ghost">
                  Create an account
                </Link>
              )}
            </div>
            <div className="stat-counter-con" ref={statCounterRef}>
              <div>
                <h3 data-target="500" data-suffix="k+">0</h3>
                <p>Games</p>
              </div>
              <div>
                <h3>All</h3>
                <p>Platforms</p>
              </div>
              <div>
                <h3 data-target="30" data-suffix="+">0</h3>
                <p>Genres</p>
              </div>
            </div>
          </div>
          <div className="home-hero-games">
            <Link to={gamePath(324997, "Baldur's Gate 3")}>
              <img src={baldurCover}></img>
              <div className="home-hero-game-content">
                <p className="game-title">
                  <strong>Baldur's Gate 3</strong>
                </p>
                <div className="game-info">
                  <p className="genre">Action</p>
                  <p className="rating">97</p>
                </div>
              </div>
            </Link>

            <Link to={gamePath(28, "Red Dead Redemption 2")} className="second-game">
              <img src={redDeadCover}></img>
              <div className="home-hero-game-content">
                <p className="game-title">
                  <strong>Red Dead Redemption 2</strong>
                </p>
                <div className="game-info">
                  <p className="genre">Action</p>
                  <p className="rating">96</p>
                </div>
              </div>
            </Link>
            <Link to={gamePath(421698, "Animal Crossing: New Horizons")}>
              <img src={animalCrossingCover}></img>
              <div className="home-hero-game-content">
                <p className="game-title">
                  <strong>Animal Crossing: New Horizons</strong>
                </p>
                <div className="game-info">
                  <p className="genre">Simulation</p>
                  <p className="rating">90</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>
      <div className="ticker-section">
        <div className="ticker-track">
          <span className="ticker-item">Action</span>
          <span className="ticker-item">RPG</span>
          <span className="ticker-item">Open World</span>
          <span className="ticker-item">Indie</span>
          <span className="ticker-item">Adventure</span>
          <span className="ticker-item">Strategy</span>
          <span className="ticker-item">Shooter</span>
          <span className="ticker-item">Platformer</span>
          <span className="ticker-item">Horror</span>
          <span className="ticker-item">Co-op</span>
          <span className="ticker-item">Racing</span>
          <span className="ticker-item">Roguelike</span>
          <span className="ticker-item" aria-hidden="true">
            Action
          </span>
          <span className="ticker-item" aria-hidden="true">
            RPG
          </span>
          <span className="ticker-item" aria-hidden="true">
            Open World
          </span>
          <span className="ticker-item" aria-hidden="true">
            Indie
          </span>
          <span className="ticker-item" aria-hidden="true">
            Adventure
          </span>
          <span className="ticker-item" aria-hidden="true">
            Strategy
          </span>
          <span className="ticker-item" aria-hidden="true">
            Shooter
          </span>
          <span className="ticker-item" aria-hidden="true">
            Platformer
          </span>
          <span className="ticker-item" aria-hidden="true">
            Horror
          </span>
          <span className="ticker-item" aria-hidden="true">
            Co-op
          </span>
          <span className="ticker-item" aria-hidden="true">
            Racing
          </span>
          <span className="ticker-item" aria-hidden="true">
            Roguelike
          </span>
        </div>
      </div>

      <section className="home-section home-features">
        <div className="home-section-inner">
          <span className="pre-header">What you get</span>
          <h2>Everything you need in one place</h2>

          <div className="feature-grid scroll-container">
            <div className="scroll-rel" ref={scrollRelRef}>
              <div className="feature-card">
                <p className="icon">⌕</p>
                <h3>Powerful search</h3>
                <p>
                  Filter by platform, genre, release year, Metacritic score, and
                  custom tags.
                </p>
              </div>
              <div className="feature-card">
                <p className="icon">⌕</p>
                <h3>Personal Library</h3>
                <p>
                  Track playing, backlogged, and beaten games. Organise into
                  custom groups.
                </p>
              </div>
              <div className="feature-card">
                <p className="icon">⌕</p>
                <h3>Rich Game Pages</h3>
                <p>
                  Cover art, screenshots, ratings, store links and full release
                  details.
                </p>
              </div>
              <div className="feature-card">
                <p className="icon">⌕</p>
                <h3>User Profiles</h3>
                <p>
                  Showcase favourites, share library stats, and track your
                  accomplishments.
                </p>
              </div>
            </div>

          </div>
          <div className="carousel-arrows">
            <button onClick={() => featureStepRef.current?.(-1)}><Arrow /></button>
            <button onClick={() => featureStepRef.current?.(1)}><Arrow /></button>
          </div>
        </div>

      </section>

      <section className="home-section">
        <div className="home-section-inner">
          <span className="pre-header">By the numbers</span>
          <h2>Built for serious gamers</h2>
          <div className="stat-grid" ref={statGridRef}>
            <div>
              <h3 data-target="500000" data-suffix="+">0</h3>
              <span>Games in database</span>
            </div>
            <div className="center">
              <h3 data-target="50" data-suffix="+">0</h3>
              <span>Platforms supported</span>
            </div>
            <div>
              <h3 data-target="30" data-suffix="+">0</h3>
              <span>Genres covered</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-preview">
        <div className="home-section-inner home-preview-grid">
          <div className="home-preview-text">
            <span className="pre-header">Game Pages</span>
            <h2>See your games the way they deserve</h2>
            <p>
              Every game has a dedicated page with cover art, screenshots,
              community scores, developer info, and every available store link.
            </p>
            <ul className="home-list">
              <li>Metacritic & community ratings</li>
              <li>Full screenshot gallery</li>
              <li>Store price comparison links</li>
              <li>Genre & tag browsing</li>
            </ul>
            <Link to="/search" className="btn btn-ghost">
              Search for a game →
            </Link>
          </div>

          {/* <div className="home-preview-card">
            <div className="home-preview-image">
            </div>
            <div className="home-preview-meta">
              <p className="home-preview-label">Red Dead Redemption 2</p>
              <p className="game-meta">Action • 87 Metascore</p>
            </div>
          </div> */}
          <div className="game-page-preview">
            <div className="game-preview">
              <img className="screenshot" src={gamePreviewImage}></img>
              <div className="game-preview-content">
                <p><strong>Red Dead Redemption 2</strong></p>
                <div>
                  <p>Action</p>
                  <p>Rockstar Games</p>
                  <p>2018</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-cta">
        <div className="home-section-inner home-cta-inner">
          <div className="cta-glow"></div>
          <h2>Ready to clean up your backlog?</h2>
          <p>Free to use. No credit card required.</p>

          <div className="home-hero-actions">
            <Link to="/search" className="btn btn-primary">
              Search games
            </Link>

            {user ? (
              <Link to="/profile" className="btn btn-ghost">
                View Profile
              </Link>
            ) : (
              <Link to="/signup" className="btn btn-ghost">
                Create free account
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

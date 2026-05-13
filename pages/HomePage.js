import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import gamePreviewImage from "../assets/images/game-preview-card.png";

import "../styles/home.css";
import { RevealWrapper } from "../components/RevealWrapper";

export default function HomePage({ user }) {
  const statGridRef = useRef(null);
  const statCounterRef = useRef(null);
  const headersRef = useRef(null);
  const headerConRef = useRef(null);
  const carouselIndexRef = useRef(0);
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

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-glow hero-glow-1"></div>
        <div className="hero-glow hero-glow-2"></div>
        <div className="hero-noise"></div>
        <div className="home-hero-wrapper">
          <RevealWrapper direction="up">
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
                Search 500,000+ titles across every platform. Track your
                backlog, rate what you've finished, and never lose your place in
                a series again.
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
          </RevealWrapper>
          <RevealWrapper direction="right" delay={150}>
            <div className="home-hero-games">
              <div>
                <svg viewBox="0 0 80 110" fill="none">
                  <rect width="80" height="110" fill="url(#g1)"></rect>
                  <defs>
                    <linearGradient
                      id="g1"
                      x1="0"
                      y1="0"
                      x2="80"
                      y2="110"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#7c3aed"></stop>
                      <stop offset="1" stopColor="#1e1b4b"></stop>
                    </linearGradient>
                  </defs>
                  <text
                    x="40"
                    y="60"
                    fontSize="36"
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.15)"
                  >
                    ◈
                  </text>
                </svg>
                <div className="home-hero-game-content">
                  <p className="game-title">
                    <strong>Baldur's Gate 3</strong>
                  </p>
                  <div className="game-info">
                    <p className="genre">Action</p>
                    <p className="rating">99</p>
                  </div>
                </div>
              </div>

              <div className="second-game">
                <svg viewBox="0 0 80 110" fill="none">
                  <rect width="80" height="110" fill="url(#g2)"></rect>
                  <defs>
                    <linearGradient
                      id="g2"
                      x1="0"
                      y1="0"
                      x2="80"
                      y2="110"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#b45309"></stop>
                      <stop offset="1" stopColor="#1c0a00"></stop>
                    </linearGradient>
                  </defs>
                  <text
                    x="40"
                    y="60"
                    fontSize="36"
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.15)"
                  >
                    ◈
                  </text>
                </svg>
                <div className="home-hero-game-content">
                  <p className="game-title">
                    <strong>Red Dead Redemption 2</strong>
                  </p>
                  <div className="game-info">
                    <p className="genre">Action</p>
                    <p className="rating">99</p>
                  </div>
                </div>
              </div>

              <div>
                <svg viewBox="0 0 80 110" fill="none">
                  <rect width="80" height="110" fill="url(#g3)"></rect>
                  <defs>
                    <linearGradient
                      id="g3"
                      x1="0"
                      y1="0"
                      x2="80"
                      y2="110"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#065f46"></stop>
                      <stop offset="1" stopColor="#022c22"></stop>
                    </linearGradient>
                  </defs>
                  <text
                    x="40"
                    y="60"
                    fontSize="36"
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.15)"
                  >
                    ◈
                  </text>
                </svg>
                <div className="home-hero-game-content">
                  <p className="game-title">
                    <strong>Animal Crossing: New Horizons</strong>
                  </p>
                  <div className="game-info">
                    <p className="genre">Simulation</p>
                    <p className="rating">99</p>
                  </div>
                </div>
              </div>
            </div>
          </RevealWrapper>
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
          <RevealWrapper direction="up">
            <span className="pre-header">What you get</span>
            <h2>Everything you need in one place</h2>
          </RevealWrapper>

          <div className="feature-grid scroll-container">
            <RevealWrapper direction="up" delay={0}>
              <div className="feature-card">
                <p className="icon">⌕</p>
                <h3>Powerful search</h3>
                <p>
                  Filter by platform, genre, release year, Metacritic score, and
                  custom tags.
                </p>
              </div>
            </RevealWrapper>
            <RevealWrapper direction="up" delay={100}>
              <div className="feature-card">
                <p className="icon">⌕</p>
                <h3>Personal Library</h3>
                <p>
                  Track playing, backlogged, and beaten games. Organise into
                  custom groups.
                </p>
              </div>
            </RevealWrapper>
            <RevealWrapper direction="up" delay={200}>
              <div className="feature-card">
                <p className="icon">⌕</p>
                <h3>Rich Game Pages</h3>
                <p>
                  Cover art, screenshots, ratings, store links and full release
                  details.
                </p>
              </div>
            </RevealWrapper>
            <RevealWrapper direction="up" delay={300}>
              <div className="feature-card">
                <p className="icon">⌕</p>
                <h3>User Profiles</h3>
                <p>
                  Showcase favourites, share library stats, and track your
                  accomplishments.
                </p>
              </div>
            </RevealWrapper>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-inner">
          <RevealWrapper direction="up">
            <span className="pre-header">By the numbers</span>
            <h2>Built for serious gamers</h2>
          </RevealWrapper>
          <RevealWrapper direction="scale" delay={100}>
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
          </RevealWrapper>
        </div>
      </section>

      <section className="home-section home-preview">
        <div className="home-section-inner home-preview-grid">
          <RevealWrapper direction="left">
            <div className="home-preview-text">
              <span className="pre-header">Game Pages</span>
              <h2>See your games the way they deserve</h2>
              <p>
                Every game has a dedicated page with cover art, screenshots,
                community scores, developer info, and every available store
                link.
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
          </RevealWrapper>

          <RevealWrapper direction="right" delay={100}>
            {/* <div className="home-preview-card">
              <div className="home-preview-image">
              </div>
              <div className="home-preview-meta">
                <p className="home-preview-label">Red Dead Redemption 2</p>
                <p className="game-meta">Action • 87 Metascore</p>
              </div>
            </div> */}
            <div className="game-page-preview">
              <img src={gamePreviewImage} alt="Game Preview"></img>
            </div>
          </RevealWrapper>
        </div>
      </section>

      <section className="home-section home-cta">
        <div className="home-section-inner home-cta-inner">
          <div className="cta-glow"></div>
          <RevealWrapper direction="up">
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
          </RevealWrapper>
        </div>
      </section>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import arrow from '../assets/images/arrow.png'
import loadingCircle from '../assets/images/loading.gif'
import whiteArrow from '../assets/images/white-arrow-up.png'
import noGameBackground from '../assets/images/noGameBackground.jpg'
import redDeadImage from '../assets/images/redDeadPreview.jpg'

import '../styles/home.css'

import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'

import { auth } from '../firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function HomePage() {
  const [user, setUser] = useState(null);

  // Detect if user is logged in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsub();
  }, []);

  return (
    <div className='home-page'>
      <Header />

      <section className="home-hero">
        <div className="home-hero-inner">
          <p className="home-kicker">Video Game Backlog Tracker</p>
          <h1>Find your next game to play and never lose track again.</h1>
          <p className="home-subtitle">
            This is a visual mockup of your homepage layout. In your real app, this hero
            will sit over your background image.
          </p>

          <div className="home-hero-actions">
            <Link to="/search" className="btn btn-primary">Start Searching</Link>

            {user ? (
              <Link to="/profile" className="btn btn-ghost">View Profile</Link>
            ) : (
              <Link to="/signup" className="btn btn-ghost">Create an account</Link>
            )}
          </div>
        </div>
      </section>

      <section className="home-section home-features">
        <div className="home-section-inner">
          <h2>Everything you need in one place</h2>
          <p className="home-section-subtitle">
            Simple, modern layout showing three key benefits of your app.
          </p>

          <div className="feature-grid">
            <div className="feature-card">
              <h3>Powerful search</h3>
              <p>Quickly find games by genre, platform, or rating.</p>
            </div>
            <div className="feature-card">
              <h3>Clean backlog</h3>
              <p>Track what you're playing, finished, or planning.</p>
            </div>
            <div className="feature-card">
              <h3>At-a-glance info</h3>
              <p>Cover art and ratings right in the list.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-preview">
        <div className="home-section-inner home-preview-grid">
          <div className="home-preview-text">
            <h2>See your games the way they deserve to be seen</h2>
            <p>
              This section visually pairs copy on the left with a mock “card” on the right.
            </p>
            <ul className="home-list">
              <li>Wide hero at the top</li>
              <li>Three feature cards in the middle</li>
              <li>Visual game card preview on the right</li>
            </ul>
            <Link to="/search" className="btn btn-ghost">Try the search page</Link>
          </div>

          <div className="home-preview-card">
            <div className="home-preview-image">
            </div>
            <div className="home-preview-meta">
              <p className="home-preview-label">Red Dead Redemption 2</p>
              <p className="game-meta">Action • 87 Metascore</p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-cta">
        <div className="home-section-inner home-cta-inner">
          <h2>Ready to clean up your backlog?</h2>
          <p>
            This final band is your call-to-action, encouraging users to search or sign up.
          </p>

          <div className="home-hero-actions">
            <Link to="/search" className="btn btn-primary">Search games</Link>

            {user ? (
              <Link to="/profile" className="btn btn-ghost">View Profile</Link>
            ) : (
              <Link to="/signup" className="btn btn-ghost">Create free account</Link>
            )}
          </div>
        </div>
      </section>

      <Footer/>
    </div>
  );
}

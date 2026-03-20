import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import GamePage from "./pages/GamePage";
import HomePage from "./pages/HomePage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import UserProfile from "./pages/UserProfile";
import SearchPage from "./pages/SearchPage";
import YourLibrary from "./pages/YourLibrary";
import UserProfileCustomizer from "./pages/UserProfileCustomize";

import { auth } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

/* ============================================================================
  Helpers
============================================================================ */
function hasStoredFirebaseUser() {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith("firebase:authUser:"));
  } catch {
    return false;
  }
}

/* 🔒 Protected wrapper that respects auth loading */
function ProtectedRoute({ user, authLoading, children }) {
  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Snapshot once at startup: do we have a stored Firebase auth user?
  const storedUserLikely = useMemo(() => hasStoredFirebaseUser(), []);

  useEffect(() => {
    let graceTimer = null;

    // If we have stored auth data, give Firebase more time to restore
    // before we declare loading "done" (prevents false redirects).
    if (storedUserLikely) {
      graceTimer = setTimeout(() => {
        setAuthLoading(false);
      }, 2000);
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("[AUTH STATE]", firebaseUser ? firebaseUser.uid : null);

      setUser(firebaseUser || null);

      // If a real user is present, end loading immediately.
      if (firebaseUser) {
        if (graceTimer) {
          clearTimeout(graceTimer);
          graceTimer = null;
        }
        setAuthLoading(false);
        return;
      }

      // If we DON'T expect a stored user, we can end loading immediately.
      if (!storedUserLikely) {
        if (graceTimer) {
          clearTimeout(graceTimer);
          graceTimer = null;
        }
        setAuthLoading(false);
      }

      // If storedUserLikely === true and firebaseUser is null,
      // we keep loading until the graceTimer ends.
    });

    return () => {
      if (graceTimer) clearTimeout(graceTimer);
      unsubscribe();
    };
  }, [storedUserLikely]);

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ Public routes */}
        <Route path="/" element={<HomePage user={user} />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage />} />

        {/* 🔒 Protected routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <UserProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/customize"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <UserProfileCustomizer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/library"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <YourLibrary />
            </ProtectedRoute>
          }
        />

        {/* Optional catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

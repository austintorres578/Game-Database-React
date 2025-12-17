import React, { useEffect, useState } from "react";
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

/* 🔒 Simple protected wrapper */
function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/signin" replace />;
  }
  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser); // null if logged out
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
            <ProtectedRoute user={user}>
              <UserProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/customize"
          element={
            <ProtectedRoute user={user}>
              <UserProfileCustomizer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/library"
          element={
            <ProtectedRoute user={user}>
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

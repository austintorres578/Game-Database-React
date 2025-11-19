import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import GamePage from "./pages/GamePage";
import HomePage from "./pages/HomePage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import UserProfile from './pages/UserProfile';
import SearchPage from './pages/SearchPage';

import { auth } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Listen for auth changes (login / logout)
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);       // null if logged out, user object if logged in
      setAuthLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    // While Firebase is checking if the user is already logged in
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* HomePage sees user but is always accessible */}
        <Route path="/" element={<HomePage user={user} />} />

        <Route path="/game" element={<GamePage />}/>
        <Route path="profile" element={<UserProfile />}/>
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/search" element={<SearchPage/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

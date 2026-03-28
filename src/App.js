import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import GamePage from "./pages/GamePage";
import CustomGame from "./pages/CustomGame";
import HomePage from "./pages/HomePage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import UserProfile from "./pages/UserProfile";
import SearchPage from "./pages/SearchPage";
import YourLibrary from "./pages/YourLibrary";
import UserProfileCustomizer from "./pages/UserProfileCustomize";
import Header from './components/Header'
import Footer from './components/Footer'

import { auth } from "./firebase/fireAuth";
import { useAuth } from "./hooks/useAuth";

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
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Header />
        <Routes>
          {/* ✅ Public routes */}
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/game" element={<GamePage auth={auth} />} />
          <Route path="/custom-game" element={<CustomGame auth={auth} />} />
          <Route path="/signup" element={<SignUpPage auth={auth} />} />
          <Route path="/signin" element={<SignInPage auth={auth}/>} />

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
      <Footer />
    </BrowserRouter>
  );
}

export default App;

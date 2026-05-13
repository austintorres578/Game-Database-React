import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, onAuthStateChanged } from "../firebase/fireAuth";

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  if (checking) return null; // or a loading spinner

  if (!user) return <Navigate to="/signin" replace />;

  return children;
}

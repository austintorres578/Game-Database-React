import { useEffect, useMemo, useState } from "react";
import { auth, onAuthStateChanged } from "../firebase/fireAuth";

function hasStoredFirebaseUser() {
  try {
    const inLocalStorage = Object.keys(localStorage).some((k) =>
      k.startsWith("firebase:authUser:"),
    );
    if (inLocalStorage) return true;
    if (typeof indexedDB !== "undefined") return true;
    return false;
  } catch {
    return false;
  }
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const storedUserLikely = useMemo(() => hasStoredFirebaseUser(), []);

  useEffect(() => {
    let safetyTimer = null;

    if (storedUserLikely) {
      safetyTimer = setTimeout(() => {
        setAuthLoading(false);
      }, 10000);
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      setAuthLoading(false);
    });

    return () => {
      if (safetyTimer) clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [storedUserLikely]);

  return { user, authLoading };
}

import { useEffect, useMemo, useState } from "react";
import { auth, onAuthStateChanged } from "../firebase/fireAuth";

function hasStoredFirebaseUser() {
  try {
    return Object.keys(localStorage).some((k) =>
      k.startsWith("firebase:authUser:"),
    );
  } catch {
    return false;
  }
}

/**
 * Wraps onAuthStateChanged with a grace-timer that prevents a false
 * "not logged in" flash when Firebase is still restoring a persisted session.
 *
 * @returns {{ user: object|null, authLoading: boolean }}
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const storedUserLikely = useMemo(() => hasStoredFirebaseUser(), []);

  useEffect(() => {
    let graceTimer = null;

    if (storedUserLikely) {
      graceTimer = setTimeout(() => {
        setAuthLoading(false);
      }, 2000);
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("[AUTH STATE]", firebaseUser ? firebaseUser.uid : null);

      setUser(firebaseUser || null);

      if (firebaseUser) {
        if (graceTimer) {
          clearTimeout(graceTimer);
          graceTimer = null;
        }
        setAuthLoading(false);
        return;
      }

      if (!storedUserLikely) {
        if (graceTimer) {
          clearTimeout(graceTimer);
          graceTimer = null;
        }
        setAuthLoading(false);
      }
    });

    return () => {
      if (graceTimer) clearTimeout(graceTimer);
      unsubscribe();
    };
  }, [storedUserLikely]);

  return { user, authLoading };
}

// Subscribes to Firebase auth state changes and exposes the current user.
// Returns a loading flag so the UI can wait before rendering auth-gated content.

import { useState, useEffect } from "react";
import { auth, onAuthStateChanged } from "../../firebase/fireAuth";

/**
 * @returns {{ user: import("firebase/auth").User|null, checkingAuth: boolean }}
 */
export function useAuthState() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("[SIGNIN AUTH STATE]", u ? u.uid : null);
      setUser(u || null);
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, checkingAuth };
}

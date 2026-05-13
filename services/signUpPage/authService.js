// Firebase Auth service for the sign-up flow.

import {
  auth,
  createUserWithEmailAndPassword,
  updateProfile,
} from "../../firebase/fireAuth";

/**
 * Creates a new Firebase Auth account and sets the display name in one step.
 * Returns the Firebase UserCredential on success.
 * Throws on failure — the caller is responsible for handling error codes.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} username - Used as the Firebase displayName
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export async function createAccount(email, password, username) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );

  await updateProfile(userCredential.user, { displayName: username });

  return userCredential;
}

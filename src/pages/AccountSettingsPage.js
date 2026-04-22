import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { app } from "../firebase/firebase";
import { auth, onAuthStateChanged } from "../firebase/fireAuth";
import { db, doc, getDoc, collection, getDocs, deleteDoc } from "../firebase/firestore";
import {
  checkSteamSession,
  logoutSteamSession,
} from "../services/yourLibrary/steamService";
import {
  steamAuthUrl,
  stripSteamQueryParam,
} from "../utils/yourLibrary/steamUtils";

import steamLogo from "../assets/images/steamLogo.png";
import userDefaultProfileImage from "../assets/images/defaultUser.png";
import trophyLogo from "../assets/images/trophyLogo.png";
import xboxLogo from '../assets/images/xboxLogo.webp';
import playstationLogo from '../assets/images/playstationLogo.png'

import "../styles/accountSettingsPage.css";
import { RevealWrapper } from "../components/RevealWrapper";

const LIBRARY_SUBCOLLECTIONS = ["library", "completed", "favorites", "groups"];

async function deleteCustomGameFiles(userId, docId, data) {
  const storage = getStorage(app);
  const deletions = [];

  if (
    typeof data.backgroundImage === "string" &&
    data.backgroundImage.includes("firebasestorage.googleapis.com")
  ) {
    const coverRef = ref(storage, `users/${userId}/customGameCovers/${docId}`);
    deletions.push(deleteObject(coverRef).catch(() => { }));
  }

  if (Array.isArray(data.screenshots)) {
    for (const screenshot of data.screenshots) {
      if (screenshot?.storagePath) {
        deletions.push(
          deleteObject(ref(storage, screenshot.storagePath)).catch(() => { }),
        );
      }
    }
  }

  await Promise.all(deletions);
}

async function clearAllLibraryData(uid) {
  for (const subcol of LIBRARY_SUBCOLLECTIONS) {
    const snap = await getDocs(collection(db, "users", uid, subcol));
    const deletions = snap.docs.map(async (docSnap) => {
      if (subcol === "library" && docSnap.data().isCustom === true) {
        await deleteCustomGameFiles(uid, docSnap.id, docSnap.data());
      }
      await deleteDoc(docSnap.ref);
    });
    await Promise.all(deletions);
  }
}

export default function AccountSettingsPage() {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("email");
  useEffect(() => {
    const sections = ["email", "password", "connected", "notifications", "danger"];
    const observers = sections.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.3 }
      );
      observer.observe(el);
      return observer;
    });
    return () => observers.forEach((obs) => obs?.disconnect());
  }, []);

  const [authUser, setAuthUser] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setAuthUser(user));
    return unsub;
  }, []);

  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (!authUser?.uid) return;
    getDoc(doc(db, "users", authUser.uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
  }, [authUser?.uid]);

  const displayName = profile?.displayName || authUser?.displayName || "NewPlayer";
  const username = profile?.username || authUser?.displayName || "newuser";
  const avatarSrc = profile?.avatarUrl || userDefaultProfileImage;

  const [steamLinked, setSteamLinked] = useState(null);
  const [steamUnlinking, setSteamUnlinking] = useState(false);
  const [steamError, setSteamError] = useState("");

  useEffect(() => {
    if (!authUser?.uid) return;

    const params = new URLSearchParams(window.location.search);
    const steamParam = params.get("steam");

    if (steamParam === "linked") {
      stripSteamQueryParam();
      setSteamLinked(true);
      return;
    }
    if (steamParam === "fail") {
      stripSteamQueryParam();
      setSteamLinked(false);
      setSteamError("Steam login failed. Please try again.");
      return;
    }

    checkSteamSession()
      .then(({ linked }) => setSteamLinked(linked))
      .catch(() => setSteamLinked(false));
  }, [authUser?.uid]);

  async function handleSteamUnlink() {
    setSteamUnlinking(true);
    await logoutSteamSession();
    setTimeout(() => {
      setSteamLinked(false);
      setSteamUnlinking(false);
    }, 3000);
  }

  function handleSteamConnect() {
    if (!authUser?.uid) return;
    window.location.href = steamAuthUrl(authUser.uid, "/account-settings");
  }

  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  async function handleChangeEmail() {
    setEmailError("");
    setEmailSuccess("");

    if (!newEmail || !confirmEmail || !emailCurrentPassword) {
      setEmailError("Please fill in all fields");
      return;
    }
    if (newEmail !== confirmEmail) {
      setEmailError("Email addresses do not match");
      return;
    }
    if (newEmail === auth.currentUser?.email) {
      setEmailError("New email must be different from your current email");
      return;
    }

    setEmailLoading(true);
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        user.email,
        emailCurrentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await verifyBeforeUpdateEmail(user, newEmail);
      setEmailSuccess(
        "Verification email sent to your new address. Please confirm it to complete the change.",
      );
      setNewEmail("");
      setConfirmEmail("");
      setEmailCurrentPassword("");
    } catch (err) {
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setEmailError("Current password is incorrect");
      } else if (err.code === "auth/email-already-in-use") {
        setEmailError("This email is already in use");
      } else if (err.code === "auth/invalid-email") {
        setEmailError("Please enter a valid email address");
      } else if (err.code === "auth/too-many-requests") {
        setEmailError("Too many attempts. Please try again later.");
      } else {
        setEmailError(err.message);
      }
    } finally {
      setEmailLoading(false);
    }
  }

  function handleCancelEmail() {
    setNewEmail("");
    setConfirmEmail("");
    setEmailCurrentPassword("");
    setEmailError("");
    setEmailSuccess("");
  }

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  async function handleUpdatePassword() {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError("Password must include at least one uppercase letter");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setPasswordError("Password must include at least one number");
      return;
    }
    if (!/[!@#$%^&*]/.test(newPassword)) {
      setPasswordError("Password must include at least one special character (!@#$%^&*)");
      return;
    }

    setPasswordLoading(true);
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setPasswordError("Current password is incorrect");
      } else if (err.code === "auth/weak-password") {
        setPasswordError("New password is too weak");
      } else if (err.code === "auth/requires-recent-login") {
        setPasswordError("Please sign out and sign back in, then try again");
      } else {
        setPasswordError(err.message);
      }
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleClearLibrary() {
    if (
      !window.confirm(
        "Are you sure? This will remove all games, groups, and import history.",
      )
    )
      return;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setClearing(true);
    try {
      await clearAllLibraryData(uid);
      alert("Library cleared successfully.");
    } catch (err) {
      console.error("Error clearing library:", err);
      alert("Something went wrong while clearing your library.");
    } finally {
      setClearing(false);
    }
  }

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        "Are you sure? This permanently deletes your account and all data.",
      )
    )
      return;

    const user = auth.currentUser;
    if (!user) return;

    setDeleting(true);
    try {
      await clearAllLibraryData(user.uid);

      await deleteDoc(doc(db, "users", user.uid));

      const storage = getStorage(app);
      const avatarRef = ref(storage, `users/${user.uid}/avatar`);
      await deleteObject(avatarRef).catch(() => { });

      await user.delete();

      // Clear stored Firebase auth key so useAuth's grace timer doesn't delay the redirect
      Object.keys(localStorage)
        .filter((k) => k.startsWith("firebase:authUser:"))
        .forEach((k) => localStorage.removeItem(k));

      navigate("/");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        alert("Please sign out and sign back in, then try again.");
      } else {
        console.error("Error deleting account:", err);
        alert("Something went wrong while deleting your account.");
      }
    } finally {
      setDeleting(false);
    }
  }

  const busy = clearing || deleting;

  return (
    // <main className="account-setting-page">
    //   <section className="account-page-header">
    //     <h1>Account Settings</h1>
    //     <Link to="/profile"><button>Back To Profile</button></Link>
    //   </section>
    //   <section className='email-section'>
    //     <div className='email-header'>
    //       <h3>Change Email</h3>
    //       <span className='header-label'>Requires your current password to save</span>
    //     </div>
    //     <div className='email-row'>
    //       <span className='label'>New email</span>
    //       <input type='email' placeholder='you@email.com' value={newEmail} onChange={e => setNewEmail(e.target.value)}></input>
    //       <span className='sub-label'>Your public @handle shown on your profile.</span>
    //     </div>
    //     <div className='email-row'>
    //       <span className='label'>Confirm new email</span>
    //       <input type='email' placeholder='you@email.com' value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)}></input>
    //     </div>
    //     <div className='email-row'>
    //       <span className='label'>Current password</span>
    //       <input type='password' placeholder='Enter current password' value={emailCurrentPassword} onChange={e => setEmailCurrentPassword(e.target.value)}></input>
    //     </div>
    //     {emailError && <p style={{ color: '#f87171', fontSize: '13px', margin: '0 0 8px' }}>{emailError}</p>}
    //     {emailSuccess && <p style={{ color: '#4ade80', fontSize: '13px', margin: '0 0 8px' }}>{emailSuccess}</p>}
    //     <div className='submit-container'>
    //       <div>
    //         <button className='cancel-button' onClick={handleCancelEmail}>Cancel</button>
    //         <button onClick={handleChangeEmail} disabled={emailLoading}>
    //           {emailLoading ? 'Saving...' : 'Save changes'}
    //         </button>
    //       </div>
    //     </div>
    //   </section>
    //   <section className='password-section'>
    //     <div className='password-header'>
    //       <h3>Change Password</h3>
    //       <span className='header-label'>Requires your current password to save</span>
    //     </div>
    //     <div className='current-password-con'>
    //       <span className='label'>Current Password</span>
    //       <input type='password' className='text-input' placeholder='Enter current password' value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}></input>
    //     </div>
    //     <div className='new-password-con'>
    //       <div>
    //         <span className='label'>New Password</span>
    //         <input type='password' className='text-input' placeholder='New password' value={newPassword} onChange={e => setNewPassword(e.target.value)}></input>
    //         <span className='sub-label'>Must meet the original signup requirements</span>
    //       </div>
    //       <div>
    //         <span className='label'>Confirm new password</span>
    //         <input type='password' className='text-input' placeholder='Repeat new password' value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}></input>
    //         <span className='sub-label' style={{ height: '12.8px' }}></span>
    //       </div>
    //     </div>
    //     {passwordError && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '8px' }}>{passwordError}</p>}
    //     {passwordSuccess && <p style={{ color: '#4ade80', fontSize: '13px', marginBottom: '8px' }}>{passwordSuccess}</p>}
    //     <div className='submit-container'>
    //       <button onClick={handleUpdatePassword} disabled={passwordLoading}>
    //         {passwordLoading ? 'Updating...' : 'Update Password'}
    //       </button>
    //     </div>
    //   </section>
    //   <section className='connected-account-section'>
    //     <div className='connected-header'>
    //       <h3>Connected accounts</h3>
    //       <span className='header-label'>Manage third-party connections</span>
    //     </div>
    //     <div className='connected-account-row steam-row'>
    //       <div className='connected-account-block'>
    //         <img src={steamLogo}></img>
    //         <div>
    //           <p><strong>Steam</strong></p>
    //           <span>{steamLinked ? 'Connected' : 'Not connected'}</span>
    //           {steamError && <span style={{ color: '#f87171', fontSize: '11px', display: 'block' }}>{steamError}</span>}
    //         </div>
    //       </div>
    //       <div>
    //         {steamLinked === null ? (
    //           <span style={{ fontSize: '12px', color: '#6b7280' }}>Checking Steam link…</span>
    //         ) : steamLinked ? (
    //           <>
    //             <button className='linked-badge'>Linked</button>
    //             <button className='unlink-button' onClick={handleSteamUnlink} disabled={steamUnlinking}>
    //               {steamUnlinking ? 'Unlinking…' : 'Unlink'}
    //             </button>
    //           </>
    //         ) : (
    //           <>
    //             <button className='unlinked-badge'>Unlinked</button>
    //             <button
    //               className='connect-button'
    //               onClick={handleSteamConnect}
    //               disabled={!authUser}
    //               title={!authUser ? 'Sign in first' : undefined}
    //             >
    //               Connect
    //             </button>
    //           </>
    //         )}
    //       </div>
    //     </div>
    //   </section>
    //   <section className='danger-zone-con'>
    //     <div className='danger-zone-header'>
    //       <h3>Danger Zone</h3>
    //       <span className='header-label'>These actions are permanent and cannot be undone</span>
    //     </div>
    //     <div className='clear-library-con danger-row'>
    //       <div>
    //         <p><strong>Clear library</strong></p>
    //         <span>Removes all games, groups, and import history</span>
    //       </div>
    //       <div>
    //         <button onClick={handleClearLibrary} disabled={busy}>
    //           {clearing ? 'Clearing...' : 'Clear Library'}
    //         </button>
    //       </div>
    //     </div>
    //     <div className='delete-account-con danger-row'>
    //       <div>
    //         <p><strong>Delete Account</strong></p>
    //         <span>Permanently deletes your account and all associated data</span>
    //       </div>
    //       <div>
    //         <button onClick={handleDeleteAccount} disabled={busy}>
    //           {deleting ? 'Deleting...' : 'Delete Account'}
    //         </button>
    //       </div>
    //     </div>
    //   </section>
    // </main>
    <main className="account-setting-page">
      <section className="account-header">
        <div>
          <span>Your Account</span>
          <h1>Account Settings</h1>
        </div>
        <div>
          <></>
        </div>
      </section>
      <section className="account-wrapper">
        <div className="fixed-nav">
          <div className="profile-section">
            <img src={avatarSrc} alt="Profile avatar"></img>
            <div>
              <p className="display-name">{displayName}</p>
              <p className="username">@{username}</p>
            </div>
          </div>
          <div className="link-section">
            <span>Account</span>
            <a href="#email" className={activeSection === "email" ? "active" : ""}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <p>Email</p>
            </a>
            <a href="#password" className={activeSection === "password" ? "active" : ""}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <p>Password</p>
            </a>
            <a href="#connected" className={activeSection === "connected" ? "active" : ""}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              <p>Connected</p>
            </a>
            {/* <a href="#notifications" className={activeSection === "notifications" ? "active" : ""}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <p>Notifications</p>
            </a> */}
          </div>
          <div className="link-section">
            <span>Danger Zone</span>
            <a href="#danger" className={activeSection === "danger" ? "active" : ""} style={{ color: "red" }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <p>Danger Zone</p>
            </a>
          </div>
        </div>
        <div className="account-settings">
          <RevealWrapper direction="up" delay={0}>
          <section id="email">
            <div className="setting-header">
              <div>
                <h3>
                  <svg
                    class="scard-title-ico"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>{" "}
                  Change Email
                </h3>
                <p>Update the email address linked to your account.</p>
              </div>
              <div>
                <span className="required">⚠ Requires password</span>
              </div>

            </div>
            <div className="sub-header">
              <span className="title">Current Email</span>
              <span>{authUser?.email || "—"}</span>
            </div>
            <form onSubmit={(e) => e.preventDefault()}>
              <label>
                New Email
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                ></input>
              </label>
              <label>
                Confirm New Email
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                ></input>
              </label>
              <label>
                Current Password
                <input
                  type="password"
                  placeholder="Enter your current password"
                  value={emailCurrentPassword}
                  onChange={(e) => setEmailCurrentPassword(e.target.value)}
                ></input>
              </label>
              {emailError && <p className="form-error">{emailError}</p>}
              {emailSuccess && <p className="form-success">{emailSuccess}</p>}
              <div className="submit-con">
                <div>
                  {(newEmail || confirmEmail || emailCurrentPassword) && (
                    <p><span></span> unsaved changes</p>
                  )}
                </div>
                <div>
                  <button className="cancel-button" type="button" onClick={handleCancelEmail}>Cancel</button>
                  <button className="save-button" type="submit" onClick={handleChangeEmail} disabled={emailLoading}>
                    {emailLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </section>
          </RevealWrapper>
          <RevealWrapper direction="up" delay={100}>
          <section id="password">
            <div className="setting-header">
              <div>
                <h3>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  Change Password
                </h3>
                <p>Use a strong, unique password you don't use elsewhere.</p>
              </div>
              <div>
                <span className="required">⚠ Requires password</span>
              </div>

            </div>
            <form onSubmit={(e) => e.preventDefault()}>
              <label>
                Current Password
                <input
                  type="password"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                ></input>
              </label>
              <div className="split-row">
                <label>
                  New Password
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  ></input>
                  {newPassword && (
                    <ul className="password-requirements">
                      <li className={newPassword.length >= 8 ? "req-met" : "req-unmet"}>At least 8 characters</li>
                      <li className={/[A-Z]/.test(newPassword) ? "req-met" : "req-unmet"}>One uppercase letter</li>
                      <li className={/[0-9]/.test(newPassword) ? "req-met" : "req-unmet"}>One number</li>
                      <li className={/[!@#$%^&*]/.test(newPassword) ? "req-met" : "req-unmet"}>One special character (!@#$%^&*)</li>
                    </ul>
                  )}
                </label>
                <label>
                  Confirm Password
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  ></input>
                </label>
              </div>
              {passwordError && <p className="form-error">{passwordError}</p>}
              {passwordSuccess && <p className="form-success">{passwordSuccess}</p>}
              <div className="submit-con">
                <div>
                  {(currentPassword || newPassword || confirmNewPassword) && (
                    <p><span></span> unsaved changes</p>
                  )}
                </div>
                <div>
                  <button
                    className="cancel-button"
                    type="button"
                    onClick={() => {
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                      setPasswordError("");
                      setPasswordSuccess("");
                    }}
                  >Cancel</button>
                  <button
                    className="save-button"
                    type="submit"
                    onClick={handleUpdatePassword}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>
            </form>
          </section>
          </RevealWrapper>
          <RevealWrapper direction="up" delay={200}>
          <section id="connected">
            <div className="setting-header">
              <div>
                <h3>
                  <svg
                    class="scard-title-ico"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  Connected Accounts
                </h3>
                <p>Manage third-party services linked to your GameDB account.</p>
              </div>
              <div>
                <span className="required">⚠ Requires password</span>
              </div>
            </div>
            <div className={`con-acc-row${steamLinked ? " connected" : ""}`}>
              <div>
                <img src={steamLogo}></img>
                <div>
                  <h3>Steam</h3>
                  <span>{steamLinked === null ? "Checking..." : steamLinked ? "Connected" : "Not connected"}</span>
                  {steamError && <span style={{ color: "#f87171", fontSize: "11px", display: "block" }}>{steamError}</span>}
                </div>
              </div>
              <div>
                {steamLinked === null ? (
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>Checking Steam link…</span>
                ) : steamLinked ? (
                  <button className="button-connect" onClick={handleSteamUnlink} disabled={steamUnlinking}>
                    {steamUnlinking ? "Unlinking…" : "Disconnect"}
                  </button>
                ) : (
                  <button className="button-connect" onClick={handleSteamConnect} disabled={!authUser}>
                    Connect
                  </button>
                )}
              </div>
            </div>
            {/* <div className="con-acc-row">
              <div>
                <img src={xboxLogo}></img>
                <div>
                  <h3>Xbox</h3>
                  <span>Not connected</span>
                </div>
              </div>
              <button className="button-connect">Connect</button>
            </div> */}
            {/* <div className="con-acc-row">
              <div>
                <img src={playstationLogo}></img>
                <div>
                  <h3>Playstation</h3>
                  <span>Not connected</span>
                </div>
              </div>
              <button className="button-connect">Connect</button>
            </div> */}
          </section>
          {/* <section id="notifications">
            <div className="setting-header">
              <div>
                <h3>
                  <svg
                    class="scard-title-ico"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  Notifications
                </h3>
                <p>Choose what you want to be notified about.</p>
              </div>
            </div>
            <div className="notif-row">
                <div className="notif-content">
                  <h3>Library import complete</h3>
                  <span>Notify when a Steam or manual import finishes processing.</span>
                </div>
                <div className="notif-check">
                  <button></button>
                </div>
              </div>
              <div className="notif-row">
                <div className="notif-content">
                  <h3>New recommendations</h3>
                  <span>Weekly digest of games you might like based on your library.</span>
                </div>
                <div className="notif-check">
                  <button></button>
                </div>
              </div>
              <div className="notif-row">
                <div className="notif-content">
                  <h3>Price drops on wishlisted games</h3>
                  <span>Get notified when a game on your wishlist goes on sale.</span>
                </div>
                <div className="notif-check">
                  <button></button>
                </div>
              </div>
              <div className="notif-row">
                <div className="notif-content">
                  <h3>Account security alerts</h3>
                  <span>Always on — you cannot disable security notifications.</span>
                </div>
                <div className="notif-check">
                  <button></button>
                </div>
              </div>
          </section> */}
          </RevealWrapper>
          <RevealWrapper direction="up" delay={300}>
          <section id="danger" className="danger-con">
            <div className="setting-header">
              <div>
                <h3>
                  <svg
                    className="scard-title-ico"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "red" }}
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  Danger Zone
                </h3>
                <p>These actions are permanent and cannot be undone.</p>
              </div>
              <div>
                <span className="danger">⚠ Irreversible</span>
              </div>

            </div>
            <div className="danger-row">
              <div className="danger-content">
                <h3>Clear Library</h3>
                <span>Removes all games, groups, and import history from your account. Your profile and settings are kept.</span>
              </div>
              <div>
                <button onClick={handleClearLibrary} disabled={busy}>
                  {clearing ? "Clearing..." : "Clear Library"}
                </button>
              </div>
            </div>
            <div className="danger-row">
              <div className="danger-content">
                <h3>Delete Account</h3>
                <span>Permanently deletes your account and all associated data. This cannot be reversed.</span>
              </div>
              <div>
                <button onClick={handleDeleteAccount} disabled={busy}>
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          </section>
          </RevealWrapper>
        </div>
      </section>
    </main>
  );
}

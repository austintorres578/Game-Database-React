import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword, verifyBeforeUpdateEmail } from 'firebase/auth'
import { getStorage, ref, deleteObject } from 'firebase/storage'
import { app } from '../firebase/firebase'
import { auth, onAuthStateChanged } from '../firebase/fireAuth'
import { db, doc, collection, getDocs, deleteDoc } from '../firebase/firestore'
import { checkSteamSession, logoutSteamSession } from '../services/yourLibrary/steamService'
import { steamAuthUrl, stripSteamQueryParam } from '../utils/yourLibrary/steamUtils'

import steamLogo from '../assets/images/steamLogo.png'
import trophyLogo from '../assets/images/trophyLogo.png'

import '../styles/accountSettingsPage.css'

const LIBRARY_SUBCOLLECTIONS = ['library', 'completed', 'favorites', 'groups']

async function deleteCustomGameFiles(userId, docId, data) {
  const storage = getStorage(app)
  const deletions = []

  if (typeof data.backgroundImage === 'string' && data.backgroundImage.includes('firebasestorage.googleapis.com')) {
    const coverRef = ref(storage, `users/${userId}/customGameCovers/${docId}`)
    deletions.push(deleteObject(coverRef).catch(() => {}))
  }

  if (Array.isArray(data.screenshots)) {
    for (const screenshot of data.screenshots) {
      if (screenshot?.storagePath) {
        deletions.push(deleteObject(ref(storage, screenshot.storagePath)).catch(() => {}))
      }
    }
  }

  await Promise.all(deletions)
}

async function clearAllLibraryData(uid) {
  for (const subcol of LIBRARY_SUBCOLLECTIONS) {
    const snap = await getDocs(collection(db, 'users', uid, subcol))
    const deletions = snap.docs.map(async (docSnap) => {
      if (subcol === 'library' && docSnap.data().isCustom === true) {
        await deleteCustomGameFiles(uid, docSnap.id, docSnap.data())
      }
      await deleteDoc(docSnap.ref)
    })
    await Promise.all(deletions)
  }
}

export default function AccountSettingsPage() {
  const navigate = useNavigate()

  const [authUser, setAuthUser] = useState(null)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setAuthUser(user))
    return unsub
  }, [])

  const [steamLinked, setSteamLinked] = useState(null)
  const [steamUnlinking, setSteamUnlinking] = useState(false)
  const [steamError, setSteamError] = useState('')

  useEffect(() => {
    if (!authUser?.uid) return

    const params = new URLSearchParams(window.location.search)
    const steamParam = params.get('steam')

    if (steamParam === 'linked') {
      stripSteamQueryParam()
      setSteamLinked(true)
      return
    }
    if (steamParam === 'fail') {
      stripSteamQueryParam()
      setSteamLinked(false)
      setSteamError('Steam login failed. Please try again.')
      return
    }

    checkSteamSession()
      .then(({ linked }) => setSteamLinked(linked))
      .catch(() => setSteamLinked(false))
  }, [authUser?.uid])

  async function handleSteamUnlink() {
    setSteamUnlinking(true)
    await logoutSteamSession()
    setTimeout(() => {
      setSteamLinked(false)
      setSteamUnlinking(false)
    }, 3000)
  }

  function handleSteamConnect() {
    if (!authUser?.uid) return
    window.location.href = steamAuthUrl(authUser.uid)
  }

  const [clearing, setClearing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState('')

  async function handleChangeEmail() {
    setEmailError('')
    setEmailSuccess('')

    if (!newEmail || !confirmEmail || !emailCurrentPassword) {
      setEmailError('Please fill in all fields')
      return
    }
    if (newEmail !== confirmEmail) {
      setEmailError('Email addresses do not match')
      return
    }

    setEmailLoading(true)
    try {
      const user = auth.currentUser
      const credential = EmailAuthProvider.credential(user.email, emailCurrentPassword)
      await reauthenticateWithCredential(user, credential)
      await verifyBeforeUpdateEmail(user, newEmail)
      setEmailSuccess('Verification email sent to your new address. Please confirm it to complete the change.')
      setNewEmail('')
      setConfirmEmail('')
      setEmailCurrentPassword('')
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setEmailError('Current password is incorrect')
      } else if (err.code === 'auth/email-already-in-use') {
        setEmailError('This email is already in use')
      } else if (err.code === 'auth/invalid-email') {
        setEmailError('Please enter a valid email address')
      } else if (err.code === 'auth/too-many-requests') {
        setEmailError('Too many attempts. Please try again later.')
      } else {
        setEmailError(err.message)
      }
    } finally {
      setEmailLoading(false)
    }
  }

  function handleCancelEmail() {
    setNewEmail('')
    setConfirmEmail('')
    setEmailCurrentPassword('')
    setEmailError('')
    setEmailSuccess('')
  }

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  async function handleUpdatePassword() {
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Please fill in all fields')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    setPasswordLoading(true)
    try {
      const user = auth.currentUser
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      setPasswordSuccess('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordError('Current password is incorrect')
      } else if (err.code === 'auth/weak-password') {
        setPasswordError('New password is too weak')
      } else if (err.code === 'auth/requires-recent-login') {
        setPasswordError('Please sign out and sign back in, then try again')
      } else {
        setPasswordError(err.message)
      }
    } finally {
      setPasswordLoading(false)
    }
  }

  async function handleClearLibrary() {
    if (!window.confirm('Are you sure? This will remove all games, groups, and import history.')) return

    const uid = auth.currentUser?.uid
    if (!uid) return

    setClearing(true)
    try {
      await clearAllLibraryData(uid)
      alert('Library cleared successfully.')
    } catch (err) {
      console.error('Error clearing library:', err)
      alert('Something went wrong while clearing your library.')
    } finally {
      setClearing(false)
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('Are you sure? This permanently deletes your account and all data.')) return

    const user = auth.currentUser
    if (!user) return

    setDeleting(true)
    try {
      await clearAllLibraryData(user.uid)

      await deleteDoc(doc(db, 'users', user.uid))

      const storage = getStorage(app)
      const avatarRef = ref(storage, `users/${user.uid}/avatar`)
      await deleteObject(avatarRef).catch(() => {})

      await user.delete()

      // Clear stored Firebase auth key so useAuth's grace timer doesn't delay the redirect
      Object.keys(localStorage)
        .filter(k => k.startsWith('firebase:authUser:'))
        .forEach(k => localStorage.removeItem(k))

      navigate('/')
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        alert('Please sign out and sign back in, then try again.')
      } else {
        console.error('Error deleting account:', err)
        alert('Something went wrong while deleting your account.')
      }
    } finally {
      setDeleting(false)
    }
  }

  const busy = clearing || deleting

  return (
    <main className="account-setting-page">
      <section className="account-page-header">
        <h1>Account Settings</h1>
        <Link to="/profile"><button>Back To Profile</button></Link>
      </section>
      <section className='email-section'>
        <div className='email-header'>
          <h3>Change Email</h3>
          <span className='header-label'>Requires your current password to save</span>
        </div>
        <div className='email-row'>
          <span className='label'>New email</span>
          <input type='email' placeholder='you@email.com' value={newEmail} onChange={e => setNewEmail(e.target.value)}></input>
          <span className='sub-label'>Your public @handle shown on your profile.</span>
        </div>
        <div className='email-row'>
          <span className='label'>Confirm new email</span>
          <input type='email' placeholder='you@email.com' value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)}></input>
        </div>
        <div className='email-row'>
          <span className='label'>Current password</span>
          <input type='password' placeholder='Enter current password' value={emailCurrentPassword} onChange={e => setEmailCurrentPassword(e.target.value)}></input>
        </div>
        {emailError && <p style={{ color: '#f87171', fontSize: '13px', margin: '0 0 8px' }}>{emailError}</p>}
        {emailSuccess && <p style={{ color: '#4ade80', fontSize: '13px', margin: '0 0 8px' }}>{emailSuccess}</p>}
        <div className='submit-container'>
          <div>
            <button className='cancel-button' onClick={handleCancelEmail}>Cancel</button>
            <button onClick={handleChangeEmail} disabled={emailLoading}>
              {emailLoading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </section>
      <section className='password-section'>
        <div className='password-header'>
          <h3>Change Password</h3>
          <span className='header-label'>Requires your current password to save</span>
        </div>
        <div className='current-password-con'>
          <span className='label'>Current Password</span>
          <input type='password' className='text-input' placeholder='Enter current password' value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}></input>
        </div>
        <div className='new-password-con'>
          <div>
            <span className='label'>New Password</span>
            <input type='password' className='text-input' placeholder='New password' value={newPassword} onChange={e => setNewPassword(e.target.value)}></input>
            <span className='sub-label'>Must meet the original signup requirements</span>
          </div>
          <div>
            <span className='label'>Confirm new password</span>
            <input type='password' className='text-input' placeholder='Repeat new password' value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}></input>
            <span className='sub-label' style={{ height: '12.8px' }}></span>
          </div>
        </div>
        {passwordError && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '8px' }}>{passwordError}</p>}
        {passwordSuccess && <p style={{ color: '#4ade80', fontSize: '13px', marginBottom: '8px' }}>{passwordSuccess}</p>}
        <div className='submit-container'>
          <button onClick={handleUpdatePassword} disabled={passwordLoading}>
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </section>
      <section className='connected-account-section'>
        <div className='connected-header'>
          <h3>Connected accounts</h3>
          <span className='header-label'>Manage third-party connections</span>
        </div>
        <div className='connected-account-row steam-row'>
          <div className='connected-account-block'>
            <img src={steamLogo}></img>
            <div>
              <p><strong>Steam</strong></p>
              <span>{steamLinked ? 'Connected' : 'Not connected'}</span>
              {steamError && <span style={{ color: '#f87171', fontSize: '11px', display: 'block' }}>{steamError}</span>}
            </div>
          </div>
          <div>
            {steamLinked === null ? (
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Checking Steam link…</span>
            ) : steamLinked ? (
              <>
                <button className='linked-badge'>Linked</button>
                <button className='unlink-button' onClick={handleSteamUnlink} disabled={steamUnlinking}>
                  {steamUnlinking ? 'Unlinking…' : 'Unlink'}
                </button>
              </>
            ) : (
              <>
                <button className='unlinked-badge'>Unlinked</button>
                <button
                  className='connect-button'
                  onClick={handleSteamConnect}
                  disabled={!authUser}
                  title={!authUser ? 'Sign in first' : undefined}
                >
                  Connect
                </button>
              </>
            )}
          </div>
        </div>
        {/* <div className='connected-account-row'>
          <div className='connected-account-block'>
            <img src={trophyLogo}></img>
            <div>
              <p><strong>Unnconnected Example</strong></p>
              <span>Not connected</span>
            </div>
          </div>
          <div>
            <button className='unlinked-badge'>unlinked</button>
            <button className='connect-button'>Connect</button>
          </div>
        </div> */}
      </section>
      <section className='danger-zone-con'>
        <div className='danger-zone-header'>
          <h3>Danger Zone</h3>
          <span className='header-label'>These actions are permanent and cannot be undone</span>
        </div>
        <div className='clear-library-con danger-row'>
          <div>
            <p><strong>Clear library</strong></p>
            <span>Removes all games, groups, and import history</span>
          </div>
          <div>
            <button onClick={handleClearLibrary} disabled={busy}>
              {clearing ? 'Clearing...' : 'Clear Library'}
            </button>
          </div>
        </div>
        <div className='delete-account-con danger-row'>
          <div>
            <p><strong>Delete Account</strong></p>
            <span>Permanently deletes your account and all associated data</span>
          </div>
          <div>
            <button onClick={handleDeleteAccount} disabled={busy}>
              {deleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

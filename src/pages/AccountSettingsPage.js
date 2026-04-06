import steamLogo from '../assets/images/steamLogo.png'
import trophyLogo from '../assets/images/trophyLogo.png'

import '../styles/accountSettingsPage.css'

export default function AccountSettingsPage() {
    return (
        <main className="account-setting-page">
            <section className="account-page-header">
                <h1>Account Settings</h1>
                <a href="#"><button>Back To Profile</button></a>
            </section>
            <section className='email-section'>
                <div className='email-header'>
                    <h3>Change Email</h3>
                    <span className='header-label'>Requires your current password to save</span>
                </div>
                <div className='email-row'>
                    <span className='label'>New email</span>
                    <input type='email'></input>
                    <span className='sub-label'>Your public @handle shown on your profile.</span>
                </div>
                <div className='email-row'>
                    <span className='label'>Confirm new email</span>
                    <input type='email'></input>
                </div>
                <div className='email-row'>
                    <span className='label'>Current password</span>
                    <input type='password'></input>
                </div>
                <div className='submit-container'>
                    <div>
                        <button className='cancel-button'>Cancel</button>
                        <button>Save changes</button>
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
                    <input type='password' className='text-input' placeholder='Enter current password'></input>
                </div>
                <div className='new-password-con'>
                    <div>
                        <span className='label'>New Password</span>
                        <input type='password' className='text-input' placeholder='New password'></input>
                        <span className='sub-label'>Must meet the original signup requirements</span>
                    </div>
                    <div>
                        <span className='label'>Confirm new password</span>
                        <input type='password' className='text-input' placeholder='Repeat new password'></input>
                    </div>
                </div>
                <div className='submit-container'>
                    <button>Update Password</button>
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
                            <span>retroplayer92 · 312 games synced</span>
                        </div>
                    </div>
                    <div>
                        <button className='linked-badge'>Linked</button>
                        <button className='unlink-button'>Unlink</button>
                    </div>
                </div>
                <div className='connected-account-row'>
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
                </div>
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
                        <button>Clear Library</button>
                    </div>
                </div>
                <div className='delete-account-con danger-row'>
                    <div>
                        <p><strong>Delete Account</strong></p>
                        <span>Permanently deletes your account and all associated data</span>
                    </div>
                    <div>
                        <button>Delete Account</button>
                    </div>
                </div>
            </section>
        </main>
    )
}
import headerLogo from '../assets/images/gameDatabase-nav-logo.png'

export default function Header(){
    return(
        <header>
            <div className='header-wrapper'>
                <a href='#' className='header-logo'><img src={headerLogo}></img></a>
                <nav>
                    <a href='#'>Home</a>
                    <a href='#'>Profile</a>
                    <a href="#">Game Search</a>
                    <a href='#'>Sign In</a>
                    <a href='#'>Sign Up</a>
                    <a href='#'>Sign Out</a>
                </nav>
            </div>
        </header>
    )
}
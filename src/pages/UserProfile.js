import react from "react"
import { Link } from 'react-router-dom';

import arrow from '../assets/images/arrow.png'
import editIcon from '../assets/images/pencilIcon.png'
import defaultProfilePic from '../assets/images/defaultUser.png'



export default function UserProfile(){
    return(
        <div className="user-profile-page">
            <div className="user-profile-container">
                <h1>Welcome User</h1>
                <div className="user-profile-image">
                    <button className="user-profile-edit"><img src={editIcon}></img></button>
                </div>
                <h2>Favorite Games</h2>

                <div className="favorite-genre">
                    <div className="genre"><p>Action</p></div>
                    <div className="genre"><p>Adventure</p></div>
                    <div className="genre"><p>Horror</p></div>
                    <div className="genre"><p>Puzzle</p></div>
                    <div className="genre"><p>Mystery</p></div>
                </div>

                <div className="favorite-games">
                    <button className="left-button favorite-game-arrow"><img src={arrow}></img></button>
                    <div className="favorite-game-wrapper">
                        <div className="favorite-game-slider">
                            <Link className="favorite-game" to="/">
                                <div className="favorite-game-art">

                                </div>
                                <p className="favorite-game-name">Game Name</p>
                                <p className="favorite-game-rating">99</p>
                            </Link>
                            <Link className="favorite-game" to="/">
                                <div className="favorite-game-art">

                                </div>
                                <p className="favorite-game-name">Game Name</p>
                            </Link>
                            <Link className="favorite-game" to="/">
                                <div className="favorite-game-art">

                                </div>
                                <p className="favorite-game-name">Game Name</p>
                            </Link>
                            <Link className="favorite-game" to="/">
                                <div className="favorite-game-art">

                                </div>
                                <p className="favorite-game-name">Game Name</p>
                            </Link>
                            <Link className="favorite-game" to="/">
                                <div className="favorite-game-art">

                                </div>
                                <p className="favorite-game-name">Game Name</p>
                            </Link>
                            <Link className="favorite-game" to="/">
                                <div className="favorite-game-art">

                                </div>
                                <p className="favorite-game-name">Game Name</p>
                            </Link>
                            <Link className="favorite-game" to="/">
                                <div className="favorite-game-art">

                                </div>
                                <p className="favorite-game-name">Game Name</p>
                            </Link>
                            <Link className="favorite-game" to="/">
                                <div className="favorite-game-art">

                                </div>
                                <p className="favorite-game-name">Game Name</p>
                            </Link>
                        </div>
                    </div>
                    <button className="right-button favorite-game-arrow"><img src={arrow}></img></button>
                </div>
            </div>
        </div>
    )
}
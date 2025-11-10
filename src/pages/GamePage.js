import React from "react";
import parse from "html-react-parser";
import loadingCircle from "../assets/images/loading.gif"

import { useState, useEffect } from 'react';

import defaultBackground from "../assets/images/background.png"

export default function GamePage(){

    //state used to determine if gamePage fetch is loading

    const [loading, setLoading] = useState(false)

    //gamePage data is stored here with preset data before fetch to prevent errors

    const [gameData,setGameData] = useState({
        "id": 0,
        "slug": "",
        "name": "",
        "name_original": "",
        "description": "",
        "metacritic": 0,
        "metacritic_platforms": [],
        "released": "",
        "tba": false,
        "updated": "2021-10-06T21:31:50",
        "background_image": defaultBackground,
        "background_image_additional": "https://media.rawg.io/media/screenshots/259/259c7b0d3a1e85f3339d07d0b65133e0.jpg",
        "website": "https://www.nintendo.com/games/detail/super-mario-odyssey-switch",
        "rating": 4.44,
        "rating_top": 5,
        "ratings": [
            {
                "id": 5,
                "title": "exceptional",
                "count": 1022,
                "percent": 65.01
            },
            {
                "id": 4,
                "title": "recommended",
                "count": 383,
                "percent": 24.36
            },
            {
                "id": 3,
                "title": "meh",
                "count": 84,
                "percent": 5.34
            },
            {
                "id": 1,
                "title": "skip",
                "count": 83,
                "percent": 5.28
            }
        ],
        "reactions": {
            "1": 10,
            "2": 1,
            "3": 13,
            "4": 4,
            "7": 8,
            "8": 1,
            "10": 3,
            "11": 3,
            "12": 5,
            "14": 1,
            "15": 1,
            "16": 1,
            "18": 1
        },
        "added": 3037,
        "added_by_status": {
            "yet": 152,
            "owned": 597,
            "beaten": 1501,
            "toplay": 397,
            "dropped": 145,
            "playing": 245
        },
        "playtime": 0,
        "screenshots_count": 17,
        "movies_count": 0,
        "creators_count": 14,
        "achievements_count": 0,
        "parent_achievements_count": 0,
        "reddit_url": "https://www.reddit.com/r/SuperMarioOdyssey/",
        "reddit_name": "Super Mario Odyssey",
        "reddit_description": "A subreddit for anything and everything related to Super Mario Odyssey on Nintendo Switch.",
        "reddit_logo": "https://b.thumbs.redditmedia.com/sNHLMe8a7tkZN-CGnquV1u2npw5b4Q17_U6Ro_FKFkk.png",
        "reddit_count": 4061,
        "twitch_count": 108,
        "youtube_count": 1000000,
        "reviews_text_count": 30,
        "ratings_count": 1542,
        "suggestions_count": 463,
        "alternative_names": [],
        "metacritic_url": "",
        "parents_count": 0,
        "additions_count": 0,
        "game_series_count": 17,
        "user_game": null,
        "reviews_count": 1572,
        "saturated_color": "0f0f0f",
        "dominant_color": "0f0f0f",
        "parent_platforms": [
            {
                "platform": {
                    "id": 7,
                    "name": "Nintendo",
                    "slug": "nintendo"
                }
            }
        ],
        "platforms": [
            {
                "platform": {
                    "id": 7,
                    "name": "Nintendo Switch",
                    "slug": "nintendo-switch",
                    "image": null,
                    "year_end": null,
                    "year_start": null,
                    "games_count": 4866,
                    "image_background": "https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg"
                },
                "released_at": "2017-10-27",
                "requirements": {}
            }
        ],
        "stores": [
            {
                "id": 32920,
                "url": "",
                "store": {
                    "id": 6,
                    "name": "Nintendo Store",
                    "slug": "nintendo",
                    "domain": "nintendo.com",
                    "games_count": 8835,
                    "image_background": "https://media.rawg.io/media/games/713/713269608dc8f2f40f5a670a14b2de94.jpg"
                }
            }
        ],
        "developers": [
            {
                "id": 16257,
                "name": "Nintendo",
                "slug": "nintendo",
                "games_count": 413,
                "image_background": "https://media.rawg.io/media/games/45f/45f6d31b0fcefe029e33d258a7beb6a2.jpg"
            }
        ],
        "genres": [
            {
                "id": 11,
                "name": "Arcade",
                "slug": "arcade",
                "games_count": 22500,
                "image_background": "https://media.rawg.io/media/games/23d/23d78acedbb5f40c9fb64e73af5af65d.jpg"
            },
            {
                "id": 83,
                "name": "Platformer",
                "slug": "platformer",
                "games_count": 89004,
                "image_background": "https://media.rawg.io/media/games/718/71891d2484a592d871e91dc826707e1c.jpg"
            }
        ],
        "tags": [
            {
                "id": 31,
                "name": "Singleplayer",
                "slug": "singleplayer",
                "language": "eng",
                "games_count": 169812,
                "image_background": "https://media.rawg.io/media/games/34b/34b1f1850a1c06fd971bc6ab3ac0ce0e.jpg"
            },
            {
                "id": 72,
                "name": "Local Multiplayer",
                "slug": "local-multiplayer",
                "language": "eng",
                "games_count": 11482,
                "image_background": "https://media.rawg.io/media/games/27b/27b02ffaab6b250cc31bf43baca1fc34.jpg"
            },
            {
                "id": 37796,
                "name": "exclusive",
                "slug": "exclusive",
                "language": "eng",
                "games_count": 4513,
                "image_background": "https://media.rawg.io/media/games/fba/fbae1bcfae1feffda6a11fbc1c939420.jpg"
            },
            {
                "id": 107,
                "name": "Family Friendly",
                "slug": "family-friendly",
                "language": "eng",
                "games_count": 3628,
                "image_background": "https://media.rawg.io/media/games/a44/a444a7628bdb49b24d06a7672f805814.jpg"
            },
            {
                "id": 88,
                "name": "Cute",
                "slug": "cute",
                "language": "eng",
                "games_count": 23506,
                "image_background": "https://media.rawg.io/media/games/c40/c40f9f0a3d1b4601a7a44d230c95f126.jpg"
            },
            {
                "id": 37797,
                "name": "true exclusive",
                "slug": "true-exclusive",
                "language": "eng",
                "games_count": 3997,
                "image_background": "https://media.rawg.io/media/games/1de/1deed95a21d854f8a5cdfc249ff54c6c.jpg"
            },
            {
                "id": 229,
                "name": "3D Platformer",
                "slug": "3d-platformer",
                "language": "eng",
                "games_count": 7450,
                "image_background": "https://media.rawg.io/media/games/9a1/9a18c226cf379272c698f26d2b79b3da.jpg"
            },
            {
                "id": 284,
                "name": "Cult Classic",
                "slug": "cult-classic",
                "language": "eng",
                "games_count": 904,
                "image_background": "https://media.rawg.io/media/games/ccf/ccf26f6e3d553a04f0033a8107a521b8.jpg"
            },
            {
                "id": 1325,
                "name": "kids",
                "slug": "kids",
                "language": "eng",
                "games_count": 5065,
                "image_background": "https://media.rawg.io/media/screenshots/256/256a021ab30040282517b855dd174d4e.jpg"
            }
        ],
        "publishers": [
            {
                "id": 10681,
                "name": "Nintendo",
                "slug": "nintendo",
                "games_count": 1214,
                "image_background": "https://media.rawg.io/media/games/98c/98c87b286cd2a2ba942167df384a9bd3.jpg"
            }
        ],
        "esrb_rating": {
            "id": 2,
            "name": "Everyone 10+",
            "slug": "everyone-10-plus"
        },
        "clip": null,
        "description_raw": "Super Mario Odyssey is a 3D platform game, a part of Nintendo’s Super Mario series. \n\n###Story \nThe game follows Mario on his quest to save Princess Peach from her forced marriage with Bowser. The game starts with Mario fighting Bowser on its aircraft. Bowers knock Mario off the ship and shreds his cap into pieces. Mario awakens in the Cap Kingdom inhabited with hat-like spirits and befriends one of them named Cappy. It turns out, Bowser also kidnapped Cappy’s sister Tiara, and now the heroes must chase Bowser through several kingdoms to save Peach and Tiara. \n\n###Gameplay \nThe gameplay of Super Mario Odyssey draws inspiration from Super Mario 64 and Super Mario Sunshine. The game consists 17 levels (named as “kingdoms”). In most of them, your goal is to collect a certain amount of Power Moons. Collecting enough of them allows the player to progress to the next kingdom. Some moons can be found in different parts of the level or acquired as a reward for completing certain tasks or challenges. The Mario’s moveset mostly resembles that of Super Mario 64 and includes wall jumps, triple jumps, somersaults, long jumps, rolling on the ground. The main new gameplay feature is that Mario can throw his hat to create temporary platforms, grab objects, attack enemies, or possess them. Possessing enemies gives you new moves and sometimes is necessary to reach certain parts of the level."
    })

    //seperate state that stores game screenshots since gameFetch doesnt have screenshots, alse has preset
    //screenshots to prevent errors

    const [gameScreenshots, setGamescreenshots] = useState([
        {
            "id": 752887,
            "image": "https://media.rawg.io/media/screenshots/ab7/ab7efedd1d85fb0007f84a2955ac9d39.jpg",
            "width": 640,
            "height": 480,
            "is_deleted": false
        },
        {
            "id": 752888,
            "image": "https://media.rawg.io/media/screenshots/788/78816464d5fddfa7f81b892b9b7c6a39.jpg",
            "width": 640,
            "height": 480,
            "is_deleted": false
        },
        {
            "id": 752889,
            "image": "https://media.rawg.io/media/screenshots/6d9/6d9a1de06e87730707e4f39acd6cc237.jpg",
            "width": 640,
            "height": 480,
            "is_deleted": false
        },
        {
            "id": 752890,
            "image": "https://media.rawg.io/media/screenshots/c11/c11eaf445d1146cad23f499adbd86b85.jpg",
            "width": 640,
            "height": 480,
            "is_deleted": false
        },
        {
            "id": 752891,
            "image": "https://media.rawg.io/media/screenshots/29f/29fb6ff5828089ce44aa0e82fe75b176.jpg",
            "width": 640,
            "height": 480,
            "is_deleted": false
        },
        {
            "id": 752892,
            "image": "https://media.rawg.io/media/screenshots/4ca/4ca53cc663eeea9eb0652413ea4e8372.jpg",
            "width": 640,
            "height": 480,
            "is_deleted": false
        }
    ])

    //variable that has description of game from gamefetch

    let description = gameData.description

    //variable that stores link in address bar

    let addressBarLink=window.location.href

    //variable used to create the link used on gamefetch to get game information

    let fetchLink 

    //api key

    let key = "?key=99cd09f6c33b42b5a24a9b447ee04a81"

    //function used to parse game description since it comes as an html string then returns parsed string

function htmlParser(html){
   return parse(html)
}

//function is used to determine the length of the game id to create the correct game fetch link


function createGameLink(){

    if(addressBarLink.slice(addressBarLink.length-7,addressBarLink.length)[0]==="#"){
         fetchLink= "https://rawg-video-games-database.p.rapidapi.com/games/"+addressBarLink.slice(addressBarLink.length-6,addressBarLink.length)
         searchForData(fetchLink+key)
        //  searchForImages(fetchLink+"/screenshots"+key)

    }else if(addressBarLink.slice(addressBarLink.length-6,addressBarLink.length)[0]==="#"){
        fetchLink= "https://rawg-video-games-database.p.rapidapi.com/games/"+addressBarLink.slice(addressBarLink.length-5,addressBarLink.length)
        searchForData(fetchLink+key)
        // searchForImages(fetchLink+"/screenshots"+key)
    }else if(addressBarLink.slice(addressBarLink.length-5,addressBarLink.length)[0]==="#"){
        fetchLink= "https://rawg-video-games-database.p.rapidapi.com/games/"+addressBarLink.slice(addressBarLink.length-4,addressBarLink.length)
        searchForData(fetchLink+key)
        // searchForImages(fetchLink+"/screenshots"+key)
    }else if(addressBarLink.slice(addressBarLink.length-4,addressBarLink.length)[0]==="#"){
        fetchLink= "https://rawg-video-games-database.p.rapidapi.com/games/"+addressBarLink.slice(addressBarLink.length-3,addressBarLink.length)
        searchForData(fetchLink+key)
        // searchForImages(fetchLink+"/screenshots"+key)
    }else if(addressBarLink.slice(addressBarLink.length-3,addressBarLink.length)[0]==="#"){
        fetchLink= "https://rawg-video-games-database.p.rapidapi.com/games/"+addressBarLink.slice(addressBarLink.length-2,addressBarLink.length)
        searchForData(fetchLink+key)
        // searchForImages(fetchLink+"/screenshots"+key)
    }else if(addressBarLink.slice(addressBarLink.length-2,addressBarLink.length)[0]==="#"){
        fetchLink= "https://rawg-video-games-database.p.rapidapi.com/games/"+addressBarLink.slice(addressBarLink.length-1,addressBarLink.length)
        searchForData(fetchLink+key)
        // searchForImages(fetchLink+"/screenshots"+key)
    }

 }

//searches for game information

function searchForData(link){
    const options = {
        method: 'GET',
        headers: {
          'X-RapidAPI-key': 'c9d7675297msh7c0392e178bd12cp1541a1jsn774cfdd0879c',
          'X-RapidAPI-Host': 'rawg-video-games-database.p.rapidapi.com'
        }
      };

      setLoading(true)

      fetch(link, options)
        .then(response => {
            return response.json()})
        .then(response => {
            console.log(response)
            setLoading(false)
            return(setGameData(response))
        })
        .catch(err => console.error(err));

}

//searches for game screenshots


function searchForImages(link){
    const options = {
        method: 'GET',
        headers: {
          'X-RapidAPI-key': 'c9d7675297msh7c0392e178bd12cp1541a1jsn774cfdd0879c',
          'X-RapidAPI-Host': 'rawg-video-games-database.p.rapidapi.com'
        }
      };
      console.log(link)

      setLoading(true)

      fetch(link, options)
        .then(response => {
            console.log(response)
            return response.json()})
        .then(response => {
            setLoading(false)
            return setGamescreenshots(response.results)
        })
        .catch(err => console.error(err));

}
    
//runs once on load

    useEffect(() => {
        createGameLink();
    }, [""]);

    //style object used to use the background from data or default to blue one if backgroun isnt present

    let gamePageSectionStyle = {
        "position":"relative",
        "display": "flex",
        "justifyContent": "center",
        "padding": "15px",
        "backgroundImage": `url(${gameData.background_image ? gameData.background_image : defaultBackground})`,
        "backgroundPosition": "center center",
        "backgroundRepeat":"no-repeat",
        "backgroundSize":"cover",
        "color":"white",
        "min-height":"100vh"  
    }

    //checks to see if screenshots are present and if not will display no images h3

    const screenShotChecker=()=>{
        if(gameScreenshots.length===0){
            return <div className="no-images"><h3>No Images</h3></div>
            
        }
    } 

    return(
        <div style={gamePageSectionStyle}>
            {loading ? <div className='loading-gif'><img src={loadingCircle}></img></div> : <div className="game-page">
                <div className="game-title header">
                    <h1>{gameData.name_original}</h1>
                </div>
                <div className="game-page-rating header"> 
                    <h1>{gameData.metacritic}</h1>
                </div>
                <div className="game-release header">
                    <p><strong>Released:</strong> {gameData.released}</p>
                </div>
                <div className="platforms-container">
                    <h3>Platforms</h3>
                    <div className="platform-labels">
                    {loading ? <div className='loading-gif'><img src={loadingCircle}></img></div> : gameData.platforms.map(platformArray => 
                            <div>
                                <p>{platformArray.platform.name}</p>
                            </div>)}
                    </div>
                </div>
                <div className="game-page-genres-container">
                    <h3>Genres</h3>
                    <div className="genre-labels">   
                        {loading ? <div className='loading-gif'><img src={loadingCircle}></img></div> : gameData.genres.map(genresArray => 
                            <div>
                                <p>{genresArray.name}</p>
                            </div>)}
                    </div>
                </div>
                <div className="dev-pub-container">
                    <h3>Developers/Publishers</h3>
                    <div>

                        {/* checks if developers or publisher info is present, if not they will say unlisted */}

                        <p>Developer: {gameData.developers[0] ? gameData.developers[0].name : "Unlisted"}</p>
                        <p>Publisher: {gameData.publishers[0] ? gameData.publishers[0].name : "Unlisted"}</p>
                    </div>
                </div>
                <div className="game-description-container">
                    <div className="header">
                        <h2>Description</h2>
                    </div>
                    <div className="game-description">
                        <div>
                            {htmlParser(description)}
                        </div>
                    </div>
                </div>
                {/* <div className="game-screenshots-container">
                    <div className="header">
                        <h2>Screenshots</h2>
                    </div>
                    {screenShotChecker()}
                    <div className="game-screenshots">
                    {
                    loading ? 
                        <p className="screenshot-load"><strong>Loading...</strong></p> 
                        : 
                        gameScreenshots.map(imageArray => 
                        <div key={imageArray.id}>
                            <img src={imageArray.image}></img>
                        </div>
                    )}
                    </div>
                </div> */}
            </div>}
        </div>
    )
}
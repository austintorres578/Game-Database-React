import {React,useEffect} from "react";
import { Link } from 'react-router-dom';

import metacriticIcon from "../assets/images/metacriticIcon.png"
import noGameBackground from '../assets/images/noGameBackground.jpg'
import addIcon from '../assets/images/plus-icon.png'

export default function Games(props){

    const gameBackgroundObj = props.background

    function gameRanking(){
        if((props.pageNumber===1)&&(document.querySelector(".games-list").children.length>=3)){
            document.querySelector(".games-list").children[0].children[0].style.border="solid 3px gold"
            document.querySelector(".games-list").children[1].children[0].style.border="solid 3px silver"
            document.querySelector(".games-list").children[2].children[0].style.border="solid 3px #cd8032"
        }
    }

   function favoriteGame(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;                  
        const sibling = button.nextElementSibling;           

        console.log(button);                                                            
        if(button.parentElement.classList.contains('successfully-favorited')){
            button.parentElement.classList.remove('successfully-favorited')
            sibling.innerText="Favorite"  
        }else{
            button.parentElement.classList.add('successfully-favorited');
            sibling.innerText="Favorited"  
        }
    
    }


    let backgroundImg

        if(gameBackgroundObj===null){
            backgroundImg=`url(${noGameBackground})`
        }
        else if(gameBackgroundObj.length===0){
            backgroundImg=`url(${noGameBackground})`
        }
        else{
            backgroundImg = `
        linear-gradient(to right,
            rgba(0, 0, 0, .5), 
            rgba(0, 0, 0, 0.0)),
        url(${gameBackgroundObj[0].image})`
        }

    let style={
        background: backgroundImg,
        backgroundSize:"cover",
        backgroundPosition:"center",
        backgroundRepeat:"no-repeat"
    }


    const platforms = (props.consoleList || []).map((platformObj, index) => {
        if (!platformObj || !platformObj.platform) return null;

        return (
            <div key={platformObj.platform.id || index}>
                <p>{platformObj.platform.name}</p>
            </div>
        );
    });


    function createGame(){
        
    }

    useEffect(() => {
        gameRanking()
    }, [""]);

    
    
    return(
        <Link to={"/game#"+props.id}>
        <div className="game" style={style}>
            <div className="game-name">
                <p>{props.name}</p>
                <div className="console-list">
                    {platforms}
                </div>
            </div>
            <div className="game-rating">
                <div>
                    <img src={metacriticIcon}></img>
                    <p>{props.rating}</p>
                </div>
            </div>
            {/* <div className="add-to-playlist successfully-favorited">
                <button onClick={favoriteGame}><img src={addIcon}></img></button>
                <p>Favorite</p>
            </div> */}
            <div className="add-to-playlist">
                <button onClick={favoriteGame}><img src={addIcon}></img></button>
                <p>Favorite</p>
            </div>
        </div>
        </Link>
    )
}
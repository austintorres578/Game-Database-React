import React, { useState, useEffect } from 'react';
import arrow from '../components/images/arrow.png'
import loadingCircle from './images/loading.gif'
import whiteArrow from './images/white-arrow-up.png'

import SearchContainer from "./SearchContainer"
import Games from './Games';
import defaultBackground from "./images/background.png"

export default function HomePage(){

    // origin varible is used to combine with the next and previous page data that comes from the api,
    // since the next and previous links have a different link we have to take from the api link and 
    //combine it with the origin variable for the fetch to work

    let origin = "https://rawg-video-games-database.p.rapidapi.com/"

    // New Search is used to determine if the page number and localstorage information have to be
    //restarted

    let newSearch = localStorage.getItem("currentLink") ? false : true

    //state that toggles a loading... when fetching data

    const [loading, setLoading] = useState(false)
    
    //state that takes the data fetched from api, the state is preset to an array so it doesnt
    //cause errors

    const [gatheredData,setGatheredData] = useState([
        {
        results:[],
        next:"",
        previous:"",
        loaded:false
        }
    ])

    //state thst controls the page number displayed on the app

    const [pageNumber, setPageNumber] = useState(1)

    const [currentConsole, setCurrentConsole] = useState("")

    const [currentGenre, setCurrentGenre] = useState("")

    const [homePageBackground, setHomePageBackground] = useState({
        backgroundImage: 'url(https://wallpapercave.com/wp/wp2552109.jpg)'
    })

    //default fetch link that gathers 40 games sorted by metacritic rating from greatest to least

    let date = new Date

    let fetchLink = "https://rawg-video-games-database.p.rapidapi.com/games?key=99cd09f6c33b42b5a24a9b447ee04a81&search_exact=true&&ordering=-metacritic&page_size=40&"

    
    function search(link){
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
                setLoading(false)
                console.log(response.results)

    // Sets the link used with fetch to be able to recall the link when the home page is refreshed.

                localStorage.setItem("currentLink",JSON.stringify(link))
    // checks to see if the search is a fresh search so the local storage page can be remade

                if(newSearch===true){
                    setPageNumber(1)
                    localStorage.setItem("currentPage",JSON.stringify(1))
                }
                if(localStorage.getItem("currentPage")==="1"){
                    localStorage.setItem("topGameBackground",JSON.stringify(response.results[0].background_image))
                    setHomePageBackground({
                        backgroundImage: `url(${response.results[0].background_image})`
                    })
                }else{
                    setHomePageBackground({
                        backgroundImage: `url(${localStorage.getItem("topGameBackground")})`
                    })
                }
                setCurrentConsole(document.querySelectorAll(".css-qc6sy-singleValue")[0].innerHTML)
                setCurrentGenre(document.querySelectorAll(".css-qc6sy-singleValue")[1].innerHTML)
                return(setGatheredData([
                    {
                    results:response.results,
                    next:response.next,
                    previous:response.previous,
    //loaded enables the page buttons to function if loaded = true
                    loaded:true
                }]))


            })
            .catch(err => console.error(err));
            
            document.querySelector('.app-container').style.display="flex"
            document.querySelector('.game-page-buttons').style.display="flex"

            document.querySelector('.home-page-section').classList.add('completed-search-con')

        
            document.querySelector('.search-parameters-con').style.justifyContent="space-between"
            document.querySelector('.search-parameters-con').style.maxWidth="1250px"
            document.querySelector('.search-parameters-con').style.marginLeft='auto'
            document.querySelector('.search-parameters-con').style.marginRight='auto'
            
            
            let searchButtonCon = document.querySelector('.search-button-container')
            
            
            document.querySelector('.game-search-input').style.width="100%"

            // searchButtonCon.style.flexDirection="row"
            
            searchButtonCon.querySelector('.search-button').style.margintop="0px"
            searchButtonCon.querySelector('.search-button').style.marginleft="10px"
            // searchButtonCon.style.width="49.5%"
            document.querySelector('.search-parameters-con h1').style.display="none"


    }
    
    //this function is called when the search button is pressed so the fetch api function can know
    //to remake the currentLink localStorage

    function freshSearch(link){
        newSearch=true
        search(link)
    }

    //function checked if the fetch data is loaded then gets the length of the next page link so the
    //splice on the link can be functional outside localhost:3000. Then it adds 1 to the currentPage state
    //so the page number on screen can change while also setting the currentPage local storage as the
    //page state but +1. then it makes newSearch false so when the search() function is called it doesnt 
    //reset page number. Then combines origin and ending of fetches next link to make a usuable link to 
    //set as localStorage current link and search with 

    function nextPage(){


        if(gatheredData[0].loaded===true){
        let length = gatheredData[0].next.length
        setPageNumber(prevState => prevState + 1)
        localStorage.setItem("currentPage",JSON.stringify(pageNumber+1))
        newSearch=false
        localStorage.setItem("currentLink",JSON.stringify(origin+gatheredData[0].next.slice(24,length)))
        search(origin+gatheredData[0].next.slice(24,length))
        }else{

        }
    }

    //prev page function does pretty much the same thing as nextPage but wont decrease page state under 1

    function prevPage(){
        if(gatheredData[0].loaded===true){
        let length = gatheredData[0].previous.length
        localStorage.setItem("currentLink",JSON.stringify("currentLink"))
        search(origin+gatheredData[0].previous.slice(24,length))
        newSearch=false
        if(pageNumber>1){
            setPageNumber(prevState => prevState - 1)
            localStorage.setItem("currentPage",JSON.stringify(pageNumber-1))
        }
        }else{
        }
    }

    //Checks to see if a link is saved in local storage and if it is the link will be used in search
    //function. then it will set page state as local storage page


    function checkLocalLink(){
        if(JSON.parse(localStorage.getItem("currentLink"))!=null){
            setPageNumber(JSON.parse(localStorage.getItem("currentPage")))
            search(JSON.parse(localStorage.getItem("currentLink")))
        }
    }
    
   
   
   

    //useEffect calls checkLocalLink once on first load


    //creates a game link for every game in fetchlinks result array

     const games = gatheredData[0].results.map(game => {
        

    

         return (
             <Games
                 key={game.id}
                 id={game.id}
                 name={game.name}
                 rating={game.metacritic}
                 background={game.short_screenshots}
                 consoleList={game.platforms}
                 pageNumber={pageNumber}
             />
         )
     })

     console.log(gatheredData[0].loaded)

     useEffect(() => {
        checkLocalLink();
    }, [""]);
    

    return(
        <div className="home-page-section" style={
            homePageBackground
        }>
            <SearchContainer 
                    data={gatheredData}
                    handleSearch={freshSearch}
                    link={fetchLink}
                    loading={loading}
                    nextPageHandler={nextPage}
                    prevPageHandler={prevPage}
                    changeConsole={setCurrentConsole}
                    changeGenre={setCurrentGenre}
                    
                />
                {/*<h1>The Best {currentGenre}</h1>
                <h1>Games Of The {currentConsole}</h1>*/} 

            <div className='app-container'>
                <div className="results-container">
                    <div className='games-list'>

                        {/* checks if search is loading and if it is, the loading screen will show but if it
                        isnt the games will show */}
                        {loading ? <div className='loading-gif'><img src={loadingCircle}></img></div> : games}
                        {gatheredData[0].loaded ? <></> : 
                    <div className='home-page-header'>
                        <div className='search-page-header'>
                            <img src={whiteArrow}></img>
                            <h1>START SEARCH ABOVE</h1> 
                        </div>
                        <div className='page-number-header'>
                            <img src={whiteArrow}></img>
                            <h1>Change Page Below</h1> 
                        </div>
                    </div>}
                    </div>
                </div>
            </div>
            <div className='game-page-buttons'>
                    <div>

                        {/* checks if search is loading and if it is, the loading screen will show but if it
                        isnt arrows will show, this is used to prevent button presses during loading */}

                        {loading ? <></> : <button onClick={prevPage}><img className="left-arrow" src={arrow}></img></button>}
                    </div>
                    <div className='page-number'>
                        <p>{ gatheredData[0].loaded ? "Page " + pageNumber : <></>}</p>
                    </div>
                    <div>

                        {/* checks if search is loading and if it is, the loading screen will show but if it
                        isnt arrows will show, this is used to prevent button presses during loading */}

                        {loading ? <></> : <button onClick={nextPage}><img className="right-arrow" src={arrow}></img></button>}
                    </div>
            </div>
        </div>
    )
}
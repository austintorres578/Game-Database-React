import React from "react";

export default function SignInPage(props){
    return(
        <div className="sign-in-page-con">
            <div className="sign-in-page-box">
                <h2>Sign In</h2>
                <input type="text" placeholder="Username"></input>
                <input type="password" placeholder="Password"></input>
                <button className="sign-in-submit-button" onClick={props.handleSignIn}>Sign In</button>
            </div>
        </div>
    )
}
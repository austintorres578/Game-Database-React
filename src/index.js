import React from "react";
import ReactDOM from "react-dom/client";

import "./style.css";
// import './styles/home.css'
import "./styles/footer.css";
import "./styles/header.css";
// import './styles/profile.css'
// import './styles/gameSearch.css'
// import './styles/signIn.css'
// import './styles/signUp.css'

import App from "./App";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

serviceWorkerRegistration.register();

// src/firebase/analytics.js
import { getAnalytics, isSupported } from "firebase/analytics";
import { app } from "./firebaseApp";

export let analytics = null;

isSupported()
  .then((supported) => {
    if (supported) analytics = getAnalytics(app);
  })
  .catch(() => {
    analytics = null;
  });
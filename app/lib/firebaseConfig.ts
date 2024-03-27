// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_APIKEY,
  authDomain: process.env.FIREBASE_AUTHDOMAIN,
  projectId: "dosth-ac312",
  storageBucket: "dosth-ac312.appspot.com",
  messagingSenderId: process.env.MESSAGE_SENDERID,
  appId: process.env.FIREBASE_APPID,
  measurementId: "G-D7EP7G8YWY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
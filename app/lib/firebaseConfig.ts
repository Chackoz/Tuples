// Import the functions you need from the SDKs you need
import { FirebaseOptions, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// const firebaseConfig: FirebaseOptions = {
//   apiKey: process.env.FIREBASE_APIKEY,
//   authDomain: process.env.FBASE_AUTH_DOMAIN,
//   projectId: "dosth-ac312",
//   storageBucket: "dosth-ac312.appspot.com",
//   messagingSenderId: process.env.FBASE_MESSAGING_SENDER_ID,
//   appId: process.env.FBASE_APP_ID,
//   measurementId: "G-D7EP7G8YWY"
// };

const firebaseConfig :FirebaseOptions ={
  apiKey: "AIzaSyAkFqN-nF1Ly95Bq4rLJ6rD6YnoH5BqMw0",
  authDomain: "tuples-v2.firebaseapp.com",
  projectId: "tuples-v2",
  storageBucket: "tuples-v2.firebasestorage.app",
  messagingSenderId: "309178583994",
  appId: "1:309178583994:web:d6438a08114a59e1552b83",
  measurementId: "G-L4NB34QJG2"
};

// Initialize Firebase

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;

export const storage = getStorage(app);
// Import the functions you need from the SDKs you need
// FIX: Using the compat library for initialization can be more robust against
// module resolution issues. The modular SDK is still used for Firestore services.
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// IMPORTANT: It is highly recommended to use environment variables for this
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);


// Initialize Cloud Firestore and get a reference to the service
// We are using the modular SDK which is recommended.
export const db = getFirestore(app);

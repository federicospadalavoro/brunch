import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAltp6Fa2Oy78QsHjPODU29nDv37-qSD9g",
  authDomain: "appbrunch.firebaseapp.com",
  projectId: "appbrunch",
  storageBucket: "appbrunch.firebasestorage.app",
  messagingSenderId: "291236400378",
  appId: "1:291236400378:web:2c6a07e4a290a4c9560d43",
  measurementId: "G-SBP0LHCD0E"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza Firestore
export const db = getFirestore(app);

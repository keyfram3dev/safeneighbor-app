import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBEAKy9D9IHC8rifgLA0JZPNfUO7XCBNes",
  authDomain: "safeneighbor-33bb0.firebaseapp.com",
  projectId: "safeneighbor-33bb0",
  storageBucket: "safeneighbor-33bb0.firebasestorage.app",
  messagingSenderId: "970840753955",
  appId: "1:970840753955:web:a6af142d9970476ad0ae96"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
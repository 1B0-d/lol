import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDmDYVD5QTPyqWxIdXY1G6RXQfXnnl7LKw",
  authDomain: "portfolio-1a377.firebaseapp.com",
  projectId: "portfolio-1a377",
  storageBucket: "portfolio-1a377.firebasestorage.app",
  messagingSenderId: "200867817255",
  appId: "1:200867817255:web:83c9c5abec38a341e06b02",
  measurementId: "G-WMXDZ5QSX2"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const authReady = setPersistence(auth, browserLocalPersistence);

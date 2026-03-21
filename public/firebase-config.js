import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDmDYVD5QTPyqWxIdXY1G6RXQfXnnl7LKw",
  authDomain: "portfolio-1a377.firebaseapp.com",
  projectId: "portfolio-1a377",
  storageBucket: "portfolio-1a377.firebasestorage.app",
  messagingSenderId: "200867817255",
  appId: "1:200867817255:web:83c9c5abec38a341e06b02",
  measurementId: "G-WMXDZ5QSX2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
import { auth, googleProvider } from "/firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const registerForm = document.getElementById("registerForm");
const registerForm_ru= document.getElementById("registerForm_ru");
const loginForm = document.getElementById("loginForm");
const loginForm_ru = document.getElementById("loginForm_ru");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const googleLoginBtn_ru = document.getElementById("googleLoginBtn_ru");
const authMessage = document.getElementById("authMessage");

async function redirectAfterAuth(user, name = "", lang) {
  const token = await user.getIdToken();

  await fetch("/api/bootstrap-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  });

  const meRes = await fetch("/api/me", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const me = await meRes.json();

  if (me.role === "admin") {
    window.location.href = "/admin.html";
    return;
  }
  if (lang ==="ru"){
  window.location.href = "/dashboard_ru.html";
  return;

}
  window.location.href = "/dashboard.html";
}


if(registerForm){
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
await redirectAfterAuth(cred.user, name, "en");
  } catch (err) {
    console.error(err);
    authMessage.textContent = `${err.code}: ${err.message}`;
  }
});}


if(loginForm){
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
await redirectAfterAuth(cred.user, "", "en");
  } catch (err) {
    console.error(err);
    authMessage.textContent = `${err.code}: ${err.message}`;
  }
});}


if(registerForm_ru){
registerForm_ru.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
await redirectAfterAuth(cred.user, name, "ru");
  } catch (err) {
    console.error(err);
    authMessage.textContent = `${err.code}: ${err.message}`;
  }
});}


if(loginForm_ru){
loginForm_ru.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
await redirectAfterAuth(cred.user, "", "ru");
  } catch (err) {
    console.error(err);
    authMessage.textContent = `${err.code}: ${err.message}`;
  }
});}


if(googleLoginBtn_ru){
googleLoginBtn_ru.addEventListener("click", async () => {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    await redirectAfterAuth(cred.user, cred.user.displayName || "","ru");
  } catch (err) {
    console.error(err);
    authMessage.textContent = `${err.code}: ${err.message}`;
  }
});}


if(googleLoginBtn){
googleLoginBtn.addEventListener("click", async () => {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    await redirectAfterAuth(cred.user, cred.user.displayName || "","en");
  } catch (err) {
    console.error(err);
    authMessage.textContent = `${err.code}: ${err.message}`;
  }
});}
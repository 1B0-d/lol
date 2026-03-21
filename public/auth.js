import { auth, googleProvider } from "/firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const authMessage = document.getElementById("authMessage");

async function redirectAfterAuth(user, name = "") {
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

  window.location.href = "/dashboard.html";
}

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await redirectAfterAuth(cred.user, name);
  } catch (err) {
    console.error(err);
    authMessage.textContent = `${err.code}: ${err.message}`;
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await redirectAfterAuth(cred.user);
  } catch (err) {
    console.error(err);
    authMessage.textContent = `${err.code}: ${err.message}`;
  }
});

googleLoginBtn.addEventListener("click", async () => {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    await redirectAfterAuth(cred.user, cred.user.displayName || "");
  } catch (err) {
    console.error(err);
    authMessage.textContent = `${err.code}: ${err.message}`;
  }
});
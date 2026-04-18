import { auth, authReady, googleProvider } from "/js/firebase-config.js?v=2";
import {
  ensureOk,
  fetchWithRetry,
  getFriendlyErrorMessage,
  getPendingRequestMessage
} from "/js/api-client.js?v=1";
import { apiUrl } from "/js/site-config.js?v=1";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const registerForm = document.getElementById("registerForm");
const registerForm_ru= document.getElementById("registerForm_ru");
const loginForm = document.getElementById("loginForm");
const loginForm_ru = document.getElementById("loginForm_ru");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const googleLoginBtn_ru = document.getElementById("googleLoginBtn_ru");
const authMessage = document.getElementById("authMessage");
const isRussianPage = window.location.pathname.includes("/ru");
const currentLang = isRussianPage ? "ru" : "en";
const logoutRedirectKey = "logout_redirect_pending";
let skipNextAutoRedirect = sessionStorage.getItem(logoutRedirectKey) === "1";

if (skipNextAutoRedirect) {
  sessionStorage.removeItem(logoutRedirectKey);
}

function setAuthMessage(message) {
  authMessage.textContent = message;
}

// Redirect to dashboard if user is already logged in
onAuthStateChanged(auth, async (user) => {
  await authReady;
  if (skipNextAutoRedirect) {
    skipNextAutoRedirect = false;

    if (user) {
      try {
        await signOut(auth);
      } catch (error) {
        console.warn("logout cleanup failed", error);
      }
    }

    return;
  }

  if (user) {
    try {
      const token = await user.getIdToken();
      const meRes = await fetchWithRetry(apiUrl("/api/me"), {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }, {
        retries: 2,
        retryDelayMs: 3000,
        timeoutMs: 15000
      });
      await ensureOk(meRes);

      const me = await meRes.json();
      if (me.role === "admin") {
        window.location.replace("/admin");
        return;
      }
      const isDashboardRu = window.location.pathname.includes("/ru");
      window.location.replace(isDashboardRu ? "/dashboard/ru" : "/dashboard");
    } catch (error) {
      console.error(error);
      setAuthMessage(getFriendlyErrorMessage(error, currentLang));
    }
  }
});

async function redirectAfterAuth(user, name = "", lang) {
  await authReady;
  setAuthMessage(getPendingRequestMessage(lang));
  const token = await user.getIdToken();

  const bootstrapResponse = await fetchWithRetry(apiUrl("/api/bootstrap-user"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  }, {
    retries: 2,
    retryDelayMs: 3000,
    timeoutMs: 15000
  });
  await ensureOk(bootstrapResponse);

  const meRes = await fetchWithRetry(apiUrl("/api/me"), {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  }, {
    retries: 2,
    retryDelayMs: 3000,
    timeoutMs: 15000
  });
  await ensureOk(meRes);

  const me = await meRes.json();

  if (me.role === "admin") {
    window.location.href = "/admin";
    return;
  }
  if (lang ==="ru"){
  window.location.href = "/dashboard/ru";
  return;

}
  window.location.href = "/dashboard";
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
    setAuthMessage(getFriendlyErrorMessage(err, "en"));
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
    setAuthMessage(getFriendlyErrorMessage(err, "en"));
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
    setAuthMessage(getFriendlyErrorMessage(err, "ru"));
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
    setAuthMessage(getFriendlyErrorMessage(err, "ru"));
  }
});}


if(googleLoginBtn_ru){
googleLoginBtn_ru.addEventListener("click", async () => {
  try {
    await authReady;
    const cred = await signInWithPopup(auth, googleProvider);
    await redirectAfterAuth(cred.user, cred.user.displayName || "","ru");
  } catch (err) {
    console.error(err);
    setAuthMessage(getFriendlyErrorMessage(err, "ru"));
  }
});}


if(googleLoginBtn){
googleLoginBtn.addEventListener("click", async () => {
  try {
    await authReady;
    const cred = await signInWithPopup(auth, googleProvider);
    await redirectAfterAuth(cred.user, cred.user.displayName || "","en");
  } catch (err) {
    console.error(err);
    setAuthMessage(getFriendlyErrorMessage(err, "en"));
  }
});}

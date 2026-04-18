import { auth, authReady } from "/js/firebase-config.js?v=2";
import { apiUrl } from "/js/site-config.js?v=1";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const adminMessagesList = document.getElementById("adminMessagesList");
const logoutBtn = document.getElementById("logoutBtn");
const logoutRedirectKey = "logout_redirect_pending";

let currentUser = null;

async function resolveAuthenticatedUser() {
  await authReady;

  if (auth.currentUser) {
    return auth.currentUser;
  }

  const timeoutAt = Date.now() + 3000;
  while (Date.now() < timeoutAt) {
    if (auth.currentUser) {
      return auth.currentUser;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return null;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString();
}

async function loadAdminMessages() {
  const token = await currentUser.getIdToken();

  const res = await fetch(apiUrl("/api/admin/messages"), {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (res.status === 401 || res.status === 403) {
    window.location.replace("/auth");
    return;
  }

  const data = await res.json();

  adminMessagesList.innerHTML = data.map((msg) => `
    <div class="message-card">
      <h3>${msg.subject}</h3>
      <p><strong>From:</strong> ${msg.userEmail}</p>
      <p><strong>Status:</strong> ${msg.status}</p>
      <p>${msg.text}</p>
      <textarea id="reply-${msg.id}" placeholder="Write reply...">${msg.reply || ""}</textarea>
      <button data-id="${msg.id}" class="reply-btn">Save Reply</button>
      <small>${formatDate(msg.createdAt)}</small>
    </div>
  `).join("");

  document.querySelectorAll(".reply-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const reply = document.getElementById(`reply-${id}`).value.trim();

      await fetch(apiUrl("/api/admin/reply"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ id, reply })
      });

      await loadAdminMessages();
    });
  });
}

logoutBtn.addEventListener("click", async () => {
  sessionStorage.setItem(logoutRedirectKey, "1");
  currentUser = null;
  await signOut(auth);
  window.location.replace("/auth");
});

onAuthStateChanged(auth, async (user) => {
  await authReady;
  const resolvedUser = user || await resolveAuthenticatedUser();
  if (!resolvedUser) {
    window.location.replace("/auth");
    return;
  }

  currentUser = resolvedUser;

  const token = await resolvedUser.getIdToken(true);
  const meRes = await fetch(apiUrl("/api/me"), {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (meRes.status === 401) {
    window.location.replace("/auth");
    return;
  }

  const me = await meRes.json();

  if (me.role !== "admin") {
    window.location.replace("/dashboard");
    return;
  }

  await loadAdminMessages();
});

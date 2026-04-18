import { auth, authReady } from "/js/firebase-config.js?v=2";
import { apiUrl } from "/js/site-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const logoutBtn = document.getElementById("logoutBtn");
const messageForm = document.getElementById("messageForm");
const messagesList = document.getElementById("messagesList");

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

function renderMessages(messages) {
  if (!messages.length) {
    messagesList.innerHTML = "<p>No messages yet.</p>";
    return;
  }

  messagesList.innerHTML = messages.map((msg) => `
    <div class="message-card">
      <h3>${msg.subject}</h3>
      <p><strong>Status:</strong> ${msg.status}</p>
      <p>${msg.text}</p>
      ${msg.reply ? `<div class="reply-box"><strong>Reply:</strong><p>${msg.reply}</p></div>` : ""}
      <small>${formatDate(msg.createdAt)}</small>
    </div>
  `).join("");
}

async function loadMessages() {
  const token = await currentUser.getIdToken();

  const res = await fetch(apiUrl("/api/messages"), {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (res.status === 401) {
    const authPath = window.location.pathname.includes('/ru') ? '/auth/ru' : '/auth';
    window.location.replace(authPath);
    return;
  }

  const data = await res.json();
  renderMessages(data);
}

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const subject = document.getElementById("subject").value.trim();
  const text = document.getElementById("messageText").value.trim();

  const token = await currentUser.getIdToken();

  await fetch(apiUrl("/api/messages"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ subject, text })
  });

  messageForm.reset();
  await loadMessages();
});

logoutBtn.addEventListener("click", async () => {
      const authPath = window.location.pathname.includes('/ru') ? '/auth/ru' : '/auth';
  await signOut(auth);
  window.location.replace(authPath);
});

onAuthStateChanged(auth, async (user) => {
  await authReady;
  const authPath = window.location.pathname.includes('/ru') ? '/auth/ru' : '/auth';
  const resolvedUser = user || await resolveAuthenticatedUser();
  if (!resolvedUser) {
    window.location.replace(authPath);
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
    const authPath = window.location.pathname.includes('/ru') ? '/auth/ru' : '/auth';
    window.location.replace(authPath);
    return;
  }

  const me = await meRes.json();

  if (me.role === "admin") {
    window.location.replace("/admin");
    return;
  }

  await loadMessages();
});

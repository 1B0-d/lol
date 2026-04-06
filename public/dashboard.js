import { auth } from "/firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const logoutBtn = document.getElementById("logoutBtn");
const messageForm = document.getElementById("messageForm");
const messagesList = document.getElementById("messagesList");

let currentUser = null;

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

  const res = await fetch("/api/messages", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (res.status === 401) {
    window.location.replace("/auth.html");
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

  await fetch("/api/messages", {
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
  await signOut(auth);
  window.location.replace("/auth.html");
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("/auth.html");
    return;
  }

  currentUser = user;

  const token = await user.getIdToken();
  const meRes = await fetch("/api/me", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (meRes.status === 401) {
    window.location.replace("/auth.html");
    return;
  }

  const me = await meRes.json();

  if (me.role === "admin") {
    window.location.replace("/admin.html");
    return;
  }

  await loadMessages();
});
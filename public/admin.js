import { auth } from "/firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const adminMessagesList = document.getElementById("adminMessagesList");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString();
}

async function loadAdminMessages() {
  const token = await currentUser.getIdToken();

  const res = await fetch("/api/admin/messages", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (res.status === 403) {
    adminMessagesList.innerHTML = "<p>Access denied.</p>";
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

      await fetch("/api/admin/reply", {
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
  await signOut(auth);
  window.location.href = "/auth.html";
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/auth.html";
    return;
  }

  currentUser = user;

  const token = await user.getIdToken();
  const meRes = await fetch("/api/me", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const me = await meRes.json();

  if (me.role !== "admin") {
    window.location.href = "/dashboard.html";
    return;
  }

  await loadAdminMessages();
});
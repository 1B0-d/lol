const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

window.APP_CONFIG = Object.assign(
  {
    apiBaseUrl: isLocalHost ? "" : "https://lol-1-bkj3.onrender.com"
  },
  window.APP_CONFIG || {}
);

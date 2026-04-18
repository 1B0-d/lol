(function () {
  const rawBaseUrl =
    typeof window.APP_CONFIG?.apiBaseUrl === "string"
      ? window.APP_CONFIG.apiBaseUrl.trim().replace(/\/+$/, "")
      : "";

  if (!rawBaseUrl) {
    return;
  }

  const resumeUrl = `${rawBaseUrl}/Resume.pdf`;
  document.querySelectorAll('a[href="/Resume.pdf"]').forEach((link) => {
    link.href = resumeUrl;
    link.target = "_blank";
    link.rel = "noopener";
  });
})();

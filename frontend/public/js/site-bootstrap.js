(function () {
  const rawBaseUrl =
    typeof window.APP_CONFIG?.apiBaseUrl === "string"
      ? window.APP_CONFIG.apiBaseUrl.trim().replace(/\/+$/, "")
      : "";

  if (!rawBaseUrl) {
    return;
  }

  document
    .querySelectorAll('a[href="/Resume.pdf"], a[href="/CV_Ildar_en.pdf"], a[href="/CV_Ildar_ru.pdf"]')
    .forEach((link) => {
      const currentHref = link.getAttribute("href");
      if (!currentHref || !currentHref.startsWith("/")) {
        return;
      }

      link.href = `${rawBaseUrl}${currentHref}`;
      link.target = "_blank";
      link.rel = "noopener";
    });
})();

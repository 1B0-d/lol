function normalizeBaseUrl(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
}

const configuredApiBaseUrl = normalizeBaseUrl(window.APP_CONFIG?.apiBaseUrl);
const apiBaseUrl = configuredApiBaseUrl || window.location.origin;

function normalizePath(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

function apiUrl(path) {
  return `${apiBaseUrl}${normalizePath(path)}`;
}

function backendAssetUrl(path) {
  const normalizedPath = normalizePath(path);
  if (!configuredApiBaseUrl) {
    return normalizedPath;
  }

  return `${configuredApiBaseUrl}${normalizedPath}`;
}

export { apiUrl, backendAssetUrl, configuredApiBaseUrl };

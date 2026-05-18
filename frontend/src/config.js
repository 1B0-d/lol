function normalizeBaseUrl(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
}

const configuredApiBaseUrl = normalizeBaseUrl(window.APP_CONFIG?.apiBaseUrl);
const configuredProductApiBaseUrl = normalizeBaseUrl(window.APP_CONFIG?.productApiBaseUrl);
const configuredOrderApiBaseUrl = normalizeBaseUrl(window.APP_CONFIG?.orderApiBaseUrl);
const apiBaseUrl = configuredApiBaseUrl || window.location.origin;
const productApiBaseUrl = configuredProductApiBaseUrl || window.location.origin;
const orderApiBaseUrl = configuredOrderApiBaseUrl || window.location.origin;

function normalizePath(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function apiUrl(path) {
  return `${apiBaseUrl}${normalizePath(path)}`;
}

export function productApiUrl(path) {
  const normalizedPath = normalizePath(path);
  if (configuredProductApiBaseUrl) {
    return `${productApiBaseUrl}${normalizedPath}`;
  }
  return `${productApiBaseUrl}/product-api${normalizedPath}`;
}

export function orderApiUrl(path) {
  const normalizedPath = normalizePath(path);
  if (configuredOrderApiBaseUrl) {
    return `${orderApiBaseUrl}${normalizedPath}`;
  }
  return `${orderApiBaseUrl}/order-api${normalizedPath}`;
}

export function backendAssetUrl(path) {
  const normalizedPath = normalizePath(path);
  return configuredApiBaseUrl ? `${configuredApiBaseUrl}${normalizedPath}` : normalizedPath;
}

const retriableStatusCodes = new Set([500, 502, 503, 504]);
const friendlyAuthErrorRu = {
  "auth/invalid-credential": "Неверный email или пароль.",
  "auth/user-not-found": "Пользователь с таким email не найден.",
  "auth/wrong-password": "Неверный пароль.",
  "auth/invalid-email": "Некорректный email.",
  "auth/too-many-requests": "Слишком много попыток. Попробуйте позже.",
};
const friendlyAuthErrorEn = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "User with this email not found.",
  "auth/wrong-password": "Incorrect password.",
  "auth/invalid-email": "Incorrect email.",
  "auth/too-many-requests": "Too many attemps. Try later.",
};
export class ApiRequestError extends Error {
  constructor(key, options = {}) {
    super(options.message || key);
    this.name = "ApiRequestError";
    this.key = key;
    this.status = options.status;
    this.cause = options.cause;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(input, init = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal || controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiRequestError("timeout", {
        message: "The request took too long to complete.",
        cause: error
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function shouldRetryError(error) {
  return (error instanceof ApiRequestError && error.key === "timeout") || error instanceof TypeError;
}

export async function fetchWithRetry(input, init = {}, options = {}) {
  const retries = options.retries ?? 0;
  const retryDelayMs = options.retryDelayMs ?? 2500;
  const timeoutMs = options.timeoutMs ?? 15000;

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetchWithTimeout(input, init, timeoutMs);
      if (retriableStatusCodes.has(response.status) && attempt < retries) {
        attempt += 1;
        await delay(retryDelayMs);
        continue;
      }

      return response;
    } catch (error) {
      if (!shouldRetryError(error) || attempt >= retries) {
        throw error;
      }

      attempt += 1;
      await delay(retryDelayMs);
    }
  }

  throw new ApiRequestError("retry_exhausted", {
    message: "The request failed after retries."
  });
}

export async function ensureOk(response) {
  if (response.ok) {
    return response;
  }

  let message = `Request failed with status ${response.status}.`;

  try {
    const payload = await response.clone().json();
    if (typeof payload?.error === "string" && payload.error.trim()) {
      message = payload.error.trim();
    }
  } catch {
    const text = await response.clone().text().catch(() => "");
    if (text.trim()) {
      message = text.trim();
    }
  }

  throw new ApiRequestError("response", {
    status: response.status,
    message
  });
}

export function getPendingRequestMessage(lang = "en") {
  if (lang === "ru") {
    return "Подключаемся к серверу. Если сервер был в спящем режиме, это может занять 10-30 секунд...";
  }

  return "Connecting to the server. If server was sleeping, this can take 10-30 seconds...";
}

export function getFriendlyErrorMessage(error, lang = "en") {
  if (lang === "ru") {
    if (error instanceof ApiRequestError && error.key === "timeout") {
      return "Сервер отвечает слишком долго. Возможно, он еще запускается. Подождите немного и попробуйте снова.";
    }

    if (error instanceof TypeError && error.message === "Failed to fetch") {
      return "Не удалось связаться с сервером. Возможно, он еще не запустился или CORS не настроен.";
    }

    if (error instanceof ApiRequestError && retriableStatusCodes.has(error.status)) {
      return "Сервер еще запускается. Подождите 10-30 секунд и попробуйте снова.";
    }
    return friendlyAuthErrorRu[error.code] || "Не удалось войти. Попробуйте еще раз.";
  } else {
    if (error instanceof ApiRequestError && error.key === "timeout") {
      return "The server is taking too long to respond. It may still be starting. Please wait a bit and try again.";
    }

    if (error instanceof TypeError && error.message === "Failed to fetch") {
      return "Could not reach the server. The server may still be starting up, or CORS may not be configured yet.";
    }

    if (error instanceof ApiRequestError && retriableStatusCodes.has(error.status)) {
      return "The server is still starting up. Please wait 10-30 seconds and try again.";
    }
    return friendlyAuthErrorEn[error.code] || "Failed to log in. Please try again.";
  }

  if (error?.code && error?.message) {
    return `${error.code}: ${error.message}`;
  }

  return error?.message || (lang === "ru" ? "Произошла ошибка. Попробуйте еще раз." : "Something went wrong. Please try again.");
}

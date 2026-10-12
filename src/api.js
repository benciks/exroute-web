const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function send(path, token, options = {}) {
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(API_URL + path, { ...options, headers });
  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response));
  }
  return response;
}

// FastAPI sends `detail` as a string, or as a list of validation errors
async function errorMessage(response) {
  try {
    const { detail } = await response.json();
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg).join(", ");
  } catch {
    // Not JSON, fall through to the generic message
  }
  return `Request failed (${response.status})`;
}

export async function register(email, password) {
  await send("/v1/auth/register", null, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

// The login endpoint is an OAuth2 password form, the email goes in `username`
export async function login(email, password) {
  const response = await send("/v1/auth/login", null, {
    method: "POST",
    body: new URLSearchParams({ username: email, password }),
  });
  const { access_token } = await response.json();
  return access_token;
}

export async function listRoutes(token) {
  const response = await send("/v1/routes", token);
  return response.json();
}

export async function createRoute(token, instructions) {
  const response = await send("/v1/routes", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instructions }),
  });
  const { result } = await response.json();
  return result;
}

// The endpoint needs the auth header, so a plain <a href> can't download it
export async function downloadGpx(token, route) {
  const response = await send(`/v1/routes/${route.id}/gpx`, token);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `route-${route.id}.gpx`;
  link.click();
  URL.revokeObjectURL(url);
}

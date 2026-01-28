export const PREFERRED_CLIENT_KEY = "calpost:activeClientId";

export function getPreferredClientId() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(PREFERRED_CLIENT_KEY);
}

export function setPreferredClientId(clientId: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(PREFERRED_CLIENT_KEY, clientId);
}

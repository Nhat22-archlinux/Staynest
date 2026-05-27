const APP_VERSION_KEY = "staynest_app_version";
const DEFAULT_APP_VERSION = "0.1.0-dev";
const CURRENT_APP_VERSION = import.meta.env.VITE_APP_VERSION || DEFAULT_APP_VERSION;

const SAFE_PREFERENCE_KEYS = new Set(["staynest_language", APP_VERSION_KEY]);
const VOLATILE_PREFIXES = ["staynest_ui_", "staynest_cache_", "staynest_search_"];
const AUTH_KEYS = ["staynest_user", "staynest_token"];
const AUTH_INCOMPATIBLE_VERSIONS = new Set(["0.1.0-auth-otp"]);

function shouldClearAuth(previousVersion: string | null, currentVersion: string) {
  return Boolean(previousVersion && AUTH_INCOMPATIBLE_VERSIONS.has(currentVersion));
}

function clearStaleStorage(previousVersion: string | null, currentVersion: string) {
  const clearAuth = shouldClearAuth(previousVersion, currentVersion);

  Object.keys(localStorage).forEach((key) => {
    if (SAFE_PREFERENCE_KEYS.has(key)) {
      return;
    }

    if (AUTH_KEYS.includes(key)) {
      if (clearAuth) {
        localStorage.removeItem(key);
      }
      return;
    }

    if (VOLATILE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  });
}

export function initializeAppVersion() {
  const storedVersion = localStorage.getItem(APP_VERSION_KEY);

  if (import.meta.env.DEV) {
    console.info(`[StayNest] App version: ${CURRENT_APP_VERSION}`);
  }

  if (storedVersion === CURRENT_APP_VERSION) {
    return {
      currentVersion: CURRENT_APP_VERSION,
      previousVersion: storedVersion,
      changed: false,
      authCleared: false,
    };
  }

  const authCleared = shouldClearAuth(storedVersion, CURRENT_APP_VERSION);
  clearStaleStorage(storedVersion, CURRENT_APP_VERSION);
  localStorage.setItem(APP_VERSION_KEY, CURRENT_APP_VERSION);

  if (import.meta.env.DEV) {
    console.info(
      `[StayNest] App version changed from ${storedVersion ?? "none"} to ${CURRENT_APP_VERSION}. Cleared stale frontend state${authCleared ? " and auth" : ""}.`,
    );
  }

  return {
    currentVersion: CURRENT_APP_VERSION,
    previousVersion: storedVersion,
    changed: true,
    authCleared,
  };
}

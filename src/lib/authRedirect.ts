const normalizeBaseUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

/**
 * Base URL for the app (origin). Used for reset-password redirect etc.
 */
export const getAuthBaseUrl = () => {
  const configuredBase = normalizeBaseUrl(import.meta.env.VITE_AUTH_REDIRECT_URL ?? '');
  if (configuredBase) {
    return configuredBase.replace(/\/auth\/callback\/?$/, '').replace(/\/$/, '') || window.location.origin;
  }
  return window.location.origin;
};

/**
 * Returns the callback URL used by Supabase auth emails.
 * If VITE_AUTH_REDIRECT_URL is set (e.g. https://app.hollyaid.com), it is used.
 * Otherwise we fall back to the current origin.
 */
export const getAuthRedirectUrl = () => {
  const base = getAuthBaseUrl();
  return `${base}/auth/callback`;
};

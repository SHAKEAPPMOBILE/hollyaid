const normalizeBaseUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

/**
 * Returns the callback URL used by Supabase auth emails.
 * If VITE_AUTH_REDIRECT_URL is set (e.g. https://app.hollyaid.com), it is used.
 * Otherwise we fall back to the current origin.
 */
export const getAuthRedirectUrl = () => {
  const configuredBase = normalizeBaseUrl(import.meta.env.VITE_AUTH_REDIRECT_URL ?? '');
  if (configuredBase) {
    return configuredBase.endsWith('/auth/callback')
      ? configuredBase
      : `${configuredBase}/auth/callback`;
  }
  return `${window.location.origin}/auth/callback`;
};

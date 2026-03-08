const PRODUCTION_URL = 'https://hollyaidapp.netlify.app';

const normalizeBaseUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

export const getAuthBaseUrl = () => {
  const configured = normalizeBaseUrl(import.meta.env.VITE_AUTH_REDIRECT_URL ?? '');
  if (configured) {
    return configured.replace(/\/auth\/callback\/?$/, '').replace(/\/$/, '') || PRODUCTION_URL;
  }
  return PRODUCTION_URL;
};

export const getAuthRedirectUrl = () => {
  return `${getAuthBaseUrl()}/auth/callback`;
};

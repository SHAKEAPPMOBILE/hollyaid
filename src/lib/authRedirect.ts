const PRODUCTION_URL = 'https://hollyaidapp.netlify.app';

export const getAuthBaseUrl = (): string => {
  const env = (import.meta.env.VITE_AUTH_REDIRECT_URL ?? '').trim().replace(/\/$/, '');
  return env || PRODUCTION_URL;
};

export const getAuthRedirectUrl = (): string => `${getAuthBaseUrl()}/auth/callback`;

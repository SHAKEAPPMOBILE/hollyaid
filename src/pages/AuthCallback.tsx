import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { EmailOtpType, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyAdminAccess } from '@/lib/companyAdminAccess';
import Logo from '@/components/Logo';
import { Loader2 } from 'lucide-react';
import { getEmailDomain } from '@/lib/supabase';
import { isTestAccountEmail } from '@/lib/plans';

const PENDING_REGISTER_KEY = 'hollyaid_pending_register';

export interface PendingRegister {
  companyName: string;
  fullName: string;
  email: string;
}

const CALLBACK_OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

const parseOtpType = (value: string | null): EmailOtpType | null => {
  if (!value) return null;
  return CALLBACK_OTP_TYPES.has(value as EmailOtpType) ? (value as EmailOtpType) : null;
};

const getSessionWithRetry = async (): Promise<Session | null> => {
  for (let i = 0; i < 5; i++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
};

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const tokenType = parseOtpType(searchParams.get('type'));

      const hashParams = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const hashError = hashParams.get('error');
      const hashErrorDesc = hashParams.get('error_description');

      // Supabase may redirect with error in hash (e.g. redirect_uri_mismatch, otp_expired)
      if (hashError) {
        const msg = hashErrorDesc || hashError;
        const decoded = typeof msg === 'string' ? decodeURIComponent(msg.replace(/\+/g, ' ')) : msg;
        setError(decoded.includes('redirect') ? `Login failed. Add ${window.location.origin}/auth/callback to Supabase Redirect URLs and set Site URL to ${window.location.origin}.` : `Login link expired or invalid. ${decoded}`);
        setTimeout(() => navigate('/auth'), 8000);
        return;
      }

      // 1) PKCE: exchange code for session (?code=...)
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (import.meta.env.DEV) console.error('Auth callback exchangeCodeForSession:', exchangeError);
          const isRedirect = /redirect|uri|url/i.test(exchangeError.message);
          const detail = isRedirect ? `Add this URL in Supabase → Auth → URL Configuration → Redirect URLs: ${window.location.origin}/auth/callback. Also set Site URL to ${window.location.origin}.` : exchangeError.message;
          setError(`Login failed: ${detail}`);
          setTimeout(() => navigate('/auth'), 8000);
          return;
        }
      }

      // 2) Token hash (?token_hash=...&type=...)
      if (tokenHash && tokenType) {
        const { error: verifyHashError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: tokenType,
        });

        if (verifyHashError) {
          if (import.meta.env.DEV) console.error('Auth callback verifyOtp:', verifyHashError);
          setError(`Login link expired or invalid. ${verifyHashError.message || 'Please request a new one.'}`);
          setTimeout(() => navigate('/auth'), 5000);
          return;
        }
      }

      // 3) Implicit flow (#access_token=...&refresh_token=...)
      if (accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (setSessionError) {
          if (import.meta.env.DEV) console.error('Auth callback setSession:', setSessionError);
          setError('Login link expired or invalid. Please request a new one.');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }
      }

      const session = await getSessionWithRetry();

      if (!session) {
        const hasAnyParam = code || (tokenHash && tokenType) || (accessToken && refreshToken);
        const callbackUrl = `${window.location.origin}/auth/callback`;
        if (!hasAnyParam) {
          setError(`No login data in URL. The email link may be pointing to another domain. In Supabase set Site URL to ${window.location.origin} and add Redirect URL: ${callbackUrl}`);
        } else {
          setError('Login link expired or invalid. Please request a new one.');
        }
        setTimeout(() => navigate('/auth'), 8000);
        return;
      }

      const userId = session.user.id;
      const email = session.user.email ?? '';

      // Pending company registration (magic-link signup)
      const pendingRaw = sessionStorage.getItem(PENDING_REGISTER_KEY);
      if (pendingRaw) {
        try {
          const pending: PendingRegister = JSON.parse(pendingRaw);
          sessionStorage.removeItem(PENDING_REGISTER_KEY);
          const domain = getEmailDomain(pending.email);
          const { error: companyError } = await supabase.from('companies').insert({
            name: pending.companyName,
            email_domain: domain,
            admin_user_id: userId,
            subscription_status: 'unpaid',
            is_test_account: isTestAccountEmail(pending.email),
          });
          if (companyError) {
            setError('Could not create company. Please try again.');
            setTimeout(() => navigate('/auth'), 3000);
            return;
          }
          await supabase.from('user_roles').insert({ user_id: userId, role: 'company_admin' });
          navigate('/auth', { state: { view: 'select-plan', registeredUserId: userId } });
          return;
        } catch {
          sessionStorage.removeItem(PENDING_REGISTER_KEY);
        }
      }

      const { data: specialist } = await supabase
        .from('specialists').select('id').eq('user_id', userId).maybeSingle();

      if (specialist) { navigate('/specialist-dashboard'); return; }

      const { company, isCompanyAdmin, error: companyAccessError } = await getCompanyAdminAccess(userId, session.user.email);

      if (companyAccessError) {
        setError(`Could not verify company access: ${companyAccessError}`);
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      if (isCompanyAdmin) {
        if (company?.subscription_status === 'unpaid') {
          navigate('/auth', { state: { view: 'select-plan', registeredUserId: userId } });
          return;
        }
        const { data: profile } = await supabase.from('profiles').select('job_title').eq('user_id', userId).single();
        navigate(profile?.job_title ? '/admin' : '/complete-profile');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('job_title').eq('user_id', userId).single();
      navigate(profile?.job_title ? '/dashboard' : '/complete-profile');
    };

    handleCallback();
  }, [location.hash, location.search, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <Logo size="md" />
      <div className="mt-8 text-center">
        {error ? (
          <p className="text-destructive max-w-md mx-auto text-left break-words">{error} Redirecting to login...</p>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Signing you in...</p>
            <p className="text-muted-foreground">Please wait a moment.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
export { PENDING_REGISTER_KEY };

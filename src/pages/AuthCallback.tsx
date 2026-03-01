import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { EmailOtpType, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyAdminAccess } from '@/lib/companyAdminAccess';
import Logo from '@/components/Logo';
import { Loader2 } from 'lucide-react';

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

      // Handle PKCE auth callbacks (?code=...)
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError('We could not complete login from the email link. Please request a new 6-digit code.');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }
      }

      // Handle token hash callbacks (?token_hash=...&type=...)
      if (tokenHash && tokenType) {
        const { error: verifyHashError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: tokenType,
        });

        if (verifyHashError) {
          setError('The one-time link is invalid or expired. Please request a new 6-digit code.');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }
      }

      // Handle implicit-flow callbacks (#access_token=...&refresh_token=...)
      if (accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (setSessionError) {
          setError('Could not restore your login session from the email link. Please request a new code.');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }
      }

      const session = await getSessionWithRetry();

      if (!session) {
        setError('Login link expired or invalid. Please request a new 6-digit code.');
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      const userId = session.user.id;

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
        if (company?.subscription_status === 'unpaid') { navigate('/auth'); return; }
        const { data: profile } = await supabase.from('profiles').select('job_title').eq('user_id', userId).single();
        navigate(profile?.job_title ? '/dashboard' : '/complete-profile');
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
          <p className="text-destructive">{error} Redirecting to login...</p>
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
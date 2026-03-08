import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyAdminAccess } from '@/lib/companyAdminAccess';
import Logo from '@/components/Logo';
import { Loader2 } from 'lucide-react';
import { getEmailDomain } from '@/lib/supabase';
import { isTestAccountEmail } from '@/lib/plans';

export const PENDING_REGISTER_KEY = 'hollyaid_pending_register';

export interface PendingRegister {
  companyName: string;
  fullName: string;
  email: string;
}

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');
        const hashError = hashParams.get('error');
        const hashErrorDesc = hashParams.get('error_description');

        if (hashError) {
          const msg = hashErrorDesc || hashError;
          const decoded = decodeURIComponent(msg.replace(/\+/g, ' '));
          setError(`Login failed: ${decoded}. Please request a new link.`);
          setTimeout(() => navigate('/auth'), 6000);
          return;
        }

        if (code) {
          const { error: err } = await supabase.auth.exchangeCodeForSession(code);
          if (err) {
            setError(`Login failed: ${err.message}`);
            setTimeout(() => navigate('/auth'), 6000);
            return;
          }
        }

        if (tokenHash) {
          const linkType = (type || 'email') as 'email' | 'recovery' | 'signup' | 'invite' | 'magiclink' | 'email_change';
          const { error: err } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: linkType });
          if (err) {
            setError('Login link expired or invalid. Please request a new one.');
            setTimeout(() => navigate('/auth'), 6000);
            return;
          }
          if (linkType === 'recovery') {
            navigate('/reset-password', { replace: true });
            return;
          }
        }

        if (accessToken && refreshToken) {
          const { error: err } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (err) {
            setError(`Login failed: ${err.message}`);
            setTimeout(() => navigate('/auth'), 6000);
            return;
          }
          if (hashType === 'recovery') {
            navigate('/reset-password', { replace: true });
            return;
          }
        }

        let session = null;
        for (let i = 0; i < 5; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session) { session = data.session; break; }
          await new Promise(r => setTimeout(r, 200));
        }

        if (!session) {
          setError('No login session found. Please request a new login link.');
          setTimeout(() => navigate('/auth'), 6000);
          return;
        }

        const userId = session.user.id;

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

        const { data: specialist } = await supabase.from('specialists').select('id').eq('user_id', userId).maybeSingle();
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

      } catch (e: any) {
        setError(`Unexpected error: ${e?.message || 'Please try logging in again.'}`);
        setTimeout(() => navigate('/auth'), 6000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <Logo size="md" />
      <div className="mt-8 text-center px-4">
        {error ? (
          <div className="max-w-md mx-auto">
            <p className="text-destructive text-left break-words mb-2">{error}</p>
            <p className="text-muted-foreground text-sm">Redirecting to login...</p>
          </div>
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

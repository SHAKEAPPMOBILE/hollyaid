import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Loader2 } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('Login link expired or invalid. Please request a new one.');
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      const userId = session.user.id;

      const { data: specialist } = await supabase
        .from('specialists').select('id').eq('user_id', userId).maybeSingle();

      if (specialist) { navigate('/specialist-dashboard'); return; }

      const { data: company } = await supabase
        .from('companies').select('id, subscription_status').eq('admin_user_id', userId).maybeSingle();

      if (company) {
        if (company.subscription_status === 'unpaid') { navigate('/auth'); return; }
        const { data: profile } = await supabase.from('profiles').select('job_title').eq('user_id', userId).single();
        navigate(profile?.job_title ? '/admin' : '/complete-profile');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('job_title').eq('user_id', userId).single();
      navigate(profile?.job_title ? '/dashboard' : '/complete-profile');
    };

    handleCallback();
  }, [navigate]);

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
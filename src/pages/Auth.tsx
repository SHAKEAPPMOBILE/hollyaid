import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isCompanyEmail, getEmailDomain } from '@/lib/supabase';
import { getAuthRedirectUrl } from '@/lib/authRedirect';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, AlertCircle, CheckCircle2, Loader2, HandHeart, ArrowLeft, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PlanSelection, { Plan } from '@/components/PlanSelection';
import { isTestAccountEmail } from '@/lib/plans';
import { PENDING_REGISTER_KEY } from '@/pages/AuthCallback';

type AuthView = 'main' | 'employee-login' | 'specialist-login' | 'company-login' | 'register' | 'select-plan';
type LinkStep = 'email' | 'email_sent';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Restore view/state when returning from callback (e.g. select-plan after magic-link signup)
  useEffect(() => {
    const state = location.state as { view?: AuthView; registeredUserId?: string } | null;
    if (state?.view === 'select-plan' && state?.registeredUserId) {
      setView('select-plan');
      setRegisteredUserId(state.registeredUserId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const [view, setView] = useState<AuthView>('main');
  const [linkStep, setLinkStep] = useState<LinkStep>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [redirectingToPayment, setRedirectingToPayment] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);

  const validateCompanyEmail = (email: string) => {
    if (!email) { setEmailError(''); return; }
    if (!isCompanyEmail(email)) {
      setEmailError('Please use your company email address (not Gmail, Yahoo, etc.)');
    } else {
      setEmailError('');
    }
  };

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setCompanyName('');
    setEmailError('');
    setLinkStep('email');
    setSelectedPlanId('');
    setRegisteredUserId(null);
  };

const handleSendMagicLink = async (e: React.FormEvent, type: 'employee' | 'specialist' | 'company') => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setLinkStep('email_sent');
      toast({ title: 'Login link sent!', description: `Check your inbox (and spam) at ${email} and click the link to sign in.` });
    }

    setLoading(false);
  };

  const handleRegisterSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isCompanyEmail(email)) {
      toast({ title: 'Invalid email', description: 'Please use your company email address.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    sessionStorage.setItem(PENDING_REGISTER_KEY, JSON.stringify({
      companyName,
      fullName,
      email: email.toLowerCase(),
    }));

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      sessionStorage.removeItem(PENDING_REGISTER_KEY);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setLinkStep('email_sent');
      toast({ title: 'Check your email', description: `We sent a link to ${email}. Click it to complete registration.` });
    }

    setLoading(false);
  };

  const handlePlanSelect = async (plan: Plan) => {
    setSelectedPlanId(plan.id);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planType: plan.id },
      });

      if (error) throw error;

      if (data?.isTestAccount) {
        toast({ title: 'Plan activated!', description: `Your ${plan.name} plan is now active.` });
        navigate('/complete-profile');
        return;
      }

      if (data?.url) {
        setRedirectingToPayment(true);
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (checkoutError: any) {
      toast({ title: 'Payment setup failed', description: checkoutError.message || 'Please try again later.', variant: 'destructive' });
    }

    setLoading(false);
  };

  if (redirectingToPayment) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Logo size="md" />
        <div className="mt-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">Setting up your payment...</p>
          <p className="text-muted-foreground">You'll be redirected to complete your subscription.</p>
        </div>
      </div>
    );
  }

  const renderLoginForm = (type: 'employee' | 'specialist' | 'company') => {
    const titles = { employee: 'Employee Login', specialist: 'Specialist Login', company: 'Company Login' };
    const descriptions = { employee: 'wellness portal', specialist: 'dashboard', company: 'admin dashboard' };

    return (
      <Card className="shadow-lg border-0">
        <CardHeader className="text-center pb-2 relative">
          {linkStep === 'email' && (
            <Button variant="ghost" size="sm" className="absolute left-4 top-4"
              onClick={() => { resetForm(); setView('main'); }}>
              <ArrowLeft size={16} className="mr-1" /> Back
            </Button>
          )}
          <div className="pt-6">
            <CardTitle className="text-2xl font-bold">{titles[type]}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {linkStep === 'email'
                ? `Sign in to access your ${descriptions[type]}`
                : `We sent a login link to ${email}. Check your inbox (and spam) and click the link to sign in.`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {linkStep === 'email' ? (
            <form onSubmit={(e) => handleSendMagicLink(e, type)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" variant="wellness" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail size={16} className="mr-2" />}
                {loading ? 'Sending...' : 'Send Login Link'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Check your inbox and click the link we sent to <strong>{email}</strong> to sign in. The link is valid for a limited time.
              </p>
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" className="w-full" disabled={loading}
                  onClick={() => supabase.auth.signInWithOtp({
                    email,
                    options: { shouldCreateUser: true, emailRedirectTo: getAuthRedirectUrl() },
                  }).then(() => toast({ title: 'Link resent', description: 'Check your inbox.' }))}>
                  Resend login link
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setLinkStep('email')}>
                  ← Change email
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderRegister = () => (
    <Card className="shadow-lg border-0">
      <CardHeader className="text-center pb-2 relative">
        <Button variant="ghost" size="sm" className="absolute left-4 top-4"
          onClick={() => { resetForm(); setView('main'); }}>
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        <div className="pt-6">
          <CardTitle className="text-2xl font-bold">Register Your Company</CardTitle>
          <CardDescription className="text-muted-foreground">
            {linkStep === 'email'
              ? 'Create an account with your company email'
              : `We sent a sign-up link to ${email}`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {linkStep === 'email' ? (
          <form onSubmit={handleRegisterSendMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input id="company-name" type="text" placeholder="Acme Inc."
                value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full-name">Your Full Name</Label>
              <Input id="full-name" type="text" placeholder="John Doe"
                value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-email">Company Email</Label>
              <Input id="register-email" type="email" placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); validateCompanyEmail(e.target.value); }}
                className={emailError ? 'border-destructive' : ''} required />
              {emailError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle size={14} />{emailError}
                </p>
              )}
              {email && !emailError && isCompanyEmail(email) && (
                <p className="text-sm text-primary flex items-center gap-1">
                  <CheckCircle2 size={14} />Valid company email
                </p>
              )}
            </div>
            <Button type="submit" variant="wellness" size="lg" className="w-full"
              disabled={loading || !!emailError}>
              {loading ? 'Sending...' : 'Send Sign-Up Link'}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Check your inbox and click the link we sent to <strong>{email}</strong> to complete your company registration. The link is valid for a limited time.
            </p>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" className="w-full" disabled={loading}
                onClick={() => {
                  sessionStorage.setItem(PENDING_REGISTER_KEY, JSON.stringify({ companyName, fullName, email: email.toLowerCase() }));
                  supabase.auth.signInWithOtp({
                    email,
                    options: { shouldCreateUser: true, emailRedirectTo: getAuthRedirectUrl() },
                  }).then(() => toast({ title: 'Link resent', description: 'Check your inbox.' }));
                }}>
                Resend sign-up link
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setLinkStep('email')}>
                ← Change email
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderMainView = () => (
    <Card className="shadow-lg border-0">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">Welcome to HollyAid</CardTitle>
        <CardDescription className="text-muted-foreground">Your corporate wellness portal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="wellness" size="lg" className="w-full"
          onClick={() => { resetForm(); setView('employee-login'); }}>
          <Users size={18} className="mr-2" /> Employee Login
        </Button>
        <Button variant="outline" size="lg" className="w-full"
          onClick={() => { resetForm(); setView('specialist-login'); }}>
          <HandHeart size={18} className="mr-2 text-primary" /> Specialist Login
        </Button>
        <Button variant="outline" size="lg" className="w-full"
          onClick={() => { resetForm(); setView('company-login'); }}>
          <Building2 size={18} className="mr-2" /> Company Login
        </Button>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>
        <Button variant="secondary" size="lg" className="w-full"
          onClick={() => { resetForm(); setView('register'); }}>
          <Building2 size={18} className="mr-2" /> Register as Company
        </Button>
        <div className="pt-4 border-t mt-6">
          <p className="text-sm text-center text-muted-foreground mb-3">New employee? Join your company</p>
          <Button variant="outline" className="w-full" onClick={() => navigate('/employee-signup')}>
            Join Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPlanSelection = () => (
    <div className="w-full max-w-4xl">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => { resetForm(); setView('main'); }}>
        <ArrowLeft size={16} className="mr-1" /> Back to Login
      </Button>
      <PlanSelection onSelectPlan={handlePlanSelect} loading={loading} selectedPlanId={selectedPlanId} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full py-6 px-8">
        <div className="flex justify-center"><Logo size="md" /></div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className={`animate-fade-up relative ${view === 'select-plan' ? 'w-full max-w-4xl' : 'w-full max-w-md'}`}>
          {view === 'main' && renderMainView()}
          {view === 'employee-login' && renderLoginForm('employee')}
          {view === 'specialist-login' && renderLoginForm('specialist')}
          {view === 'company-login' && renderLoginForm('company')}
          {view === 'register' && renderRegister()}
          {view === 'select-plan' && renderPlanSelection()}
        </div>
      </main>
    </div>
  );
};

export default Auth;

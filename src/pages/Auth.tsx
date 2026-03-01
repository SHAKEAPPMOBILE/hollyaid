import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isCompanyEmail, getEmailDomain } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, AlertCircle, CheckCircle2, Loader2, HandHeart, ArrowLeft, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PlanSelection, { WELLNESS_PLANS, Plan } from '@/components/PlanSelection';
import { isTestAccountEmail } from '@/lib/plans';

type AuthView = 'main' | 'employee-login' | 'specialist-login' | 'company-login' | 'register' | 'select-plan';
type OtpStep = 'email' | 'otp';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [view, setView] = useState<AuthView>('main');
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [redirectingToPayment, setRedirectingToPayment] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const [userType, setUserType] = useState<'employee' | 'specialist' | 'company'>('employee');

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
    setOtp('');
    setFullName('');
    setCompanyName('');
    setEmailError('');
    setOtpStep('email');
    setSelectedPlanId('');
    setRegisteredUserId(null);
  };

  const checkProfileComplete = async (userId: string): Promise<boolean> => {
    const { data }: any = await supabase
      .from('profiles')
      .select('job_title')
      .eq('user_id', userId)
      .single();
    return !!data?.job_title;
  };

  const ensureSessionReady = async () => {
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) return true;
      await new Promise((r) => setTimeout(r, 150));
    }
    return false;
  };

  const handleSendOtp = async (e: React.FormEvent, type: 'employee' | 'specialist' | 'company') => {
    e.preventDefault();
    setLoading(true);
    setUserType(type);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setOtpStep('otp');
      toast({ title: 'Code sent!', description: `Check your inbox at ${email}` });
    }

    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (error || !data.user) {
      toast({ title: 'Invalid code', description: error?.message || 'Please try again.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const sessionReady = await ensureSessionReady();
    if (!sessionReady) {
      toast({ title: 'Login failed', description: 'Session not ready. Please try again.', variant: 'destructive' });
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    const loggedInUser = data.user;

    if (userType === 'specialist') {
      const { data: specialist, error: specialistError } = await supabase
        .from('specialists')
        .select('id')
        .eq('user_id', loggedInUser.id)
        .maybeSingle();

      if (specialistError || !specialist) {
        toast({ title: 'Access denied', description: 'This account is not registered as a specialist.', variant: 'destructive' });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      toast({ title: 'Welcome back!', description: "You've been logged in successfully." });
      navigate('/specialist-dashboard');

    } else if (userType === 'company') {
      const { data: company } = await supabase
        .from('companies')
        .select('id, subscription_status')
        .eq('admin_user_id', loggedInUser.id)
        .single();

      if (!company) {
        toast({ title: 'Access denied', description: 'This account is not registered as a company admin.', variant: 'destructive' });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (company.subscription_status === 'unpaid') {
        setRegisteredUserId(loggedInUser.id);
        setView('select-plan');
        setLoading(false);
        return;
      }

      const profileComplete = await checkProfileComplete(loggedInUser.id);
      toast({ title: 'Welcome back!', description: "You've been logged in successfully." });
      navigate(profileComplete ? '/admin' : '/complete-profile');

    } else {
      const { data: specialist } = await supabase
        .from('specialists')
        .select('id')
        .eq('user_id', loggedInUser.id)
        .single();

      if (specialist) {
        toast({ title: 'Wrong login', description: 'Please use specialist login for your account.', variant: 'destructive' });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      const emailDomain = getEmailDomain(email);
      if (emailDomain) {
        const { data: existingLink } = await supabase
          .from('company_employees')
          .select('id')
          .eq('user_id', loggedInUser.id)
          .maybeSingle();

        if (!existingLink) {
          const { data: matchingCompany } = await supabase
            .from('companies')
            .select('id, name')
            .eq('email_domain', emailDomain)
            .eq('subscription_status', 'active')
            .maybeSingle();

          if (matchingCompany) {
            const { data: existingInvite } = await supabase
              .from('company_employees')
              .select('id')
              .eq('company_id', matchingCompany.id)
              .eq('email', email.toLowerCase())
              .maybeSingle();

            if (existingInvite) {
              await supabase.from('company_employees').update({
                user_id: loggedInUser.id,
                status: 'accepted',
                accepted_at: new Date().toISOString(),
              }).eq('id', existingInvite.id);
            } else {
              await supabase.from('company_employees').insert({
                company_id: matchingCompany.id,
                email: email.toLowerCase(),
                user_id: loggedInUser.id,
                status: 'accepted',
                accepted_at: new Date().toISOString(),
                auto_joined: true,
              });
            }

            const { data: existingRole } = await supabase
              .from('user_roles')
              .select('id')
              .eq('user_id', loggedInUser.id)
              .eq('role', 'employee')
              .maybeSingle();

            if (!existingRole) {
              await supabase.from('user_roles').insert({ user_id: loggedInUser.id, role: 'employee' });
            }

            toast({ title: 'Welcome!', description: `You've been added to ${matchingCompany.name}` });
          }
        }
      }

      const profileComplete = await checkProfileComplete(loggedInUser.id);
      toast({ title: 'Welcome back!', description: "You've been logged in successfully." });
      navigate(profileComplete ? '/dashboard' : '/complete-profile');
    }

    setLoading(false);
  };

  const handleRegisterSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isCompanyEmail(email)) {
      toast({ title: 'Invalid email', description: 'Please use your company email address.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setOtpStep('otp');
      toast({ title: 'Code sent!', description: `Check your inbox at ${email}` });
    }

    setLoading(false);
  };

  const handleRegisterVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });

    if (error || !data.user) {
      toast({ title: 'Invalid code', description: error?.message || 'Please try again.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const newUser = data.user;
    const domain = getEmailDomain(email);

    const { error: companyError } = await supabase.from('companies').insert({
      name: companyName,
      email_domain: domain,
      admin_user_id: newUser.id,
      subscription_status: 'unpaid',
      is_test_account: isTestAccountEmail(email),
    });

    if (companyError) {
      toast({ title: 'Company creation failed', description: companyError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    await supabase.from('user_roles').insert({ user_id: newUser.id, role: 'company_admin' });

    setRegisteredUserId(newUser.id);
    setView('select-plan');
    toast({ title: 'Account created!', description: 'Now choose your wellness minutes plan.' });

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

  const renderOtpForm = (type: 'employee' | 'specialist' | 'company') => {
    const titles = { employee: 'Employee Login', specialist: 'Specialist Login', company: 'Company Login' };
    const descriptions = { employee: 'wellness portal', specialist: 'dashboard', company: 'admin dashboard' };

    return (
      <Card className="shadow-lg border-0">
        <CardHeader className="text-center pb-2 relative">
          <Button variant="ghost" size="sm" className="absolute left-4 top-4"
            onClick={() => { resetForm(); setView('main'); }}>
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <div className="pt-6">
            <CardTitle className="text-2xl font-bold">{titles[type]}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {otpStep === 'email'
                ? `Sign in to access your ${descriptions[type]}`
                : `Enter the 6-digit code sent to ${email}`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {otpStep === 'email' ? (
            <form onSubmit={(e) => handleSendOtp(e, type)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" variant="wellness" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail size={16} className="mr-2" />}
                {loading ? 'Sending...' : 'Send Login Code'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-code">Verification Code</Label>
                <Input id="otp-code" type="text" placeholder="123456" maxLength={6}
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required />
                <p className="text-xs text-muted-foreground">Didn't receive it?{' '}
                  <button type="button" className="text-primary underline"
                    onClick={() => supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
                      .then(() => toast({ title: 'Code resent!', description: 'Check your inbox.' }))}>
                    Resend code
                  </button>
                </p>
              </div>
              <Button type="submit" variant="wellness" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setOtpStep('email')}>
                ← Change email
              </Button>
            </form>
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
            {otpStep === 'email'
              ? 'Create an account with your company email'
              : `Enter the 6-digit code sent to ${email}`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {otpStep === 'email' ? (
          <form onSubmit={handleRegisterSendOtp} className="space-y-4">
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
              {loading ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegisterVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp-code">Verification Code</Label>
              <Input id="otp-code" type="text" placeholder="123456" maxLength={6}
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required />
              <p className="text-xs text-muted-foreground">Didn't receive it?{' '}
                <button type="button" className="text-primary underline"
                  onClick={() => supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
                    .then(() => toast({ title: 'Code resent!', description: 'Check your inbox.' }))}>
                  Resend code
                </button>
              </p>
            </div>
            <Button type="submit" variant="wellness" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Verify & Create Account'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setOtpStep('email')}>
              ← Change email
            </Button>
          </form>
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
          {view === 'employee-login' && renderOtpForm('employee')}
          {view === 'specialist-login' && renderOtpForm('specialist')}
          {view === 'company-login' && renderOtpForm('company')}
          {view === 'register' && renderRegister()}
          {view === 'select-plan' && renderPlanSelection()}
        </div>
      </main>
    </div>
  );
};

export default Auth;

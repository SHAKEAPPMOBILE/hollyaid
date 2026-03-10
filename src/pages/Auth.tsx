curl -o /Users/leonelmeneses/hollyaid/src/pages/Auth.tsx https://raw.githubusercontent.com/SHAKEAPPMOBILE/hollyaid/main/src/pages/Auth.tsx 2>/dev/null; echo "ignore that" && cat > /Users/leonelmeneses/hollyaid/src/pages/Auth.tsx << 'ENDOFFILE'
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isCompanyEmail, getEmailDomain } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, AlertCircle, CheckCircle2, Loader2, HandHeart, ArrowLeft, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PlanSelection, { Plan } from '@/components/PlanSelection';
import { isTestAccountEmail } from '@/lib/plans';

type AuthView = 'main' | 'employee-login' | 'specialist-login' | 'company-login' | 'register' | 'select-plan';

const ROLE_PINS: Record<'employee' | 'specialist' | 'company', string> = {
  specialist: '7777',
  company: '1111',
  employee: '3333',
};

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    const state = location.state as { view?: AuthView; registeredUserId?: string } | null;
    if (state?.view === 'select-plan' && state?.registeredUserId) {
      setView('select-plan');
      setRegisteredUserId(state.registeredUserId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const [view, setView] = useState<AuthView>('main');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
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
    } else { setEmailError(''); }
  };

  const resetForm = () => {
    setEmail(''); setPin(''); setPassword(''); setFullName('');
    setCompanyName(''); setEmailError(''); setSelectedPlanId(''); setRegisteredUserId(null);
  };

  const handlePinLogin = async (e: React.FormEvent, type: 'employee' | 'specialist' | 'company') => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) { toast({ title: 'Enter your email', variant: 'destructive' }); return; }
    if (!pin) { toast({ title: 'Enter your PIN', variant: 'destructive' }); return; }
    if (pin !== ROLE_PINS[type]) {
      toast({ title: 'Wrong PIN', description: 'The PIN you entered is incorrect.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      let authorized = false;
      const { data: rpcResult, error: rpcError } = await supabase.rpc('is_authorized_email', { check_email: normalizedEmail });
      if (!rpcError) { authorized = !!rpcResult; }
      else {
        const fallbackAllowed = ['info@hollyaid.com', 'contact@shakeapp.today', 'leoneltelesmeneses@gmail.com'];
        authorized = fallbackAllowed.includes(normalizedEmail);
      }
      if (!authorized) {
        toast({ title: 'Access denied', description: 'Your email is not authorized to access this platform.', variant: 'destructive' });
        return;
      }
      const internalPassword = `hollyaid_${type}_${ROLE_PINS[type]}_internal`;
      let { error: signInError } = await signIn(normalizedEmail, internalPassword);
      if (signInError) {
        const { error: signUpError } = await signUp(normalizedEmail, internalPassword, normalizedEmail.split('@')[0]);
        if (signUpError) { toast({ title: 'Login failed', description: signUpError.message, variant: 'destructive' }); return; }
        const { error: retryError } = await signIn(normalizedEmail, internalPassword);
        if (retryError) { toast({ title: 'Login failed', description: retryError.message, variant: 'destructive' }); return; }
      }
      toast({ title: 'Welcome!', description: 'You are now signed in.' });
      navigate('/');
    } finally { setLoading(false); }
  };

  const handleRegisterWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCompanyEmail(email)) { toast({ title: 'Invalid email', description: 'Please use your company email address (not Gmail, Yahoo, etc.).', variant: 'destructive' }); return; }
    if (!password || password.length < 6) { toast({ title: 'Password required', description: 'Use at least 6 characters.', variant: 'destructive' }); return; }
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const { error: signUpError } = await signUp(normalizedEmail, password, fullName.trim());
    if (signUpError) { toast({ title: 'Sign up failed', description: signUpError.message, variant: 'destructive' }); setLoading(false); return; }
    const { user: newUser, error: signInError } = await signIn(normalizedEmail, password);
    if (signInError || !newUser) { toast({ title: 'Account created', description: signInError?.message ?? 'Please sign in.', variant: 'destructive' }); setLoading(false); return; }
    const domain = getEmailDomain(normalizedEmail);
    const { error: companyError } = await supabase.from('companies').insert({ name: companyName.trim(), email_domain: domain, admin_user_id: newUser.id, subscription_status: 'unpaid', is_test_account: isTestAccountEmail(normalizedEmail) });
    if (companyError) { toast({ title: 'Could not create company', description: companyError.message, variant: 'destructive' }); setLoading(false); return; }
    await supabase.from('user_roles').insert({ user_id: newUser.id, role: 'company_admin' });
    setRegisteredUserId(newUser.id); setView('select-plan'); setLoading(false);
  };

  const handlePlanSelect = async (plan: Plan) => {
    setSelectedPlanId(plan.id); setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', { body: { planType: plan.id } });
      if (error) throw error;
      if (data?.isTestAccount) { toast({ title: 'Plan activated!', description: `Your ${plan.name} plan is now active.` }); navigate('/complete-profile'); return; }
      if (data?.url) { setRedirectingToPayment(true); window.location.href = data.url; }
      else throw new Error('No checkout URL received');
    } catch (checkoutError: any) { toast({ title: 'Payment setup failed', description: checkoutError.message || 'Please try again later.', variant: 'destructive' }); }
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
          <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={() => { resetForm(); setView('main'); }}>
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <div className="pt-6">
            <CardTitle className="text-2xl font-bold">{titles[type]}</CardTitle>
            <CardDescription className="text-muted-foreground">Sign in to access your {descriptions[type]}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => handlePinLogin(e, type)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input id="login-email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-pin">PIN</Label>
              <Input id="login-pin" type="password" placeholder="Enter your PIN" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} required />
            </div>
            <Button type="submit" variant="wellness" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound size={16} className="mr-2" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  };

  const renderRegister = () => (
    <Card className="shadow-lg border-0">
      <CardHeader className="text-center pb-2 relative">
        <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={() => { resetForm(); setView('main'); }}>
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        <div className="pt-6">
          <CardTitle className="text-2xl font-bold">Register Your Company</CardTitle>
          <CardDescription className="text-muted-foreground">Create an account with your company email</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegisterWithPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input id="company-name" type="text" placeholder="Acme Inc." value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full-name">Your Full Name</Label>
            <Input id="full-name" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-email">Company Email</Label>
            <Input id="register-email" type="email" placeholder="you@company.com" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); validateCompanyEmail(e.target.value); }} className={emailError ? 'border-destructive' : ''} required />
            {emailError && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle size={14} />{emailError}</p>}
            {email && !emailError && isCompanyEmail(email) && <p className="text-sm text-primary flex items-center gap-1"><CheckCircle2 size={14} />Valid company email</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password">Password</Label>
            <Input id="register-password" type="password" placeholder="••••••••" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" variant="wellness" size="lg" className="w-full" disabled={loading || !!emailError}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2 inline" />Creating account...</> : 'Create account'}
          </Button>
        </form>
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
        <Button variant="wellness" size="lg" className="w-full" onClick={() => { resetForm(); setView('employee-login'); }}>
          <Users size={18} className="mr-2" /> Employee Login
        </Button>
        <Button variant="outline" size="lg" className="w-full" onClick={() => { resetForm(); setView('specialist-login'); }}>
          <HandHeart size={18} className="mr-2 text-primary" /> Specialist Login
        </Button>
        <Button variant="outline" size="lg" className="w-full" onClick={() => { resetForm(); setView('company-login'); }}>
          <Building2 size={18} className="mr-2" /> Company Login
        </Button>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>
        <Button variant="secondary" size="lg" className="w-full" onClick={() => { resetForm(); setView('register'); }}>
          <Building2 size={18} className="mr-2" /> Register as Company
        </Button>
        <div className="pt-4 border-t mt-6">
          <p className="text-sm text-center text-muted-foreground mb-3">New employee? Join your company</p>
          <Button variant="outline" className="w-full" onClick={() => navigate('/employee-signup')}>Join Now</Button>
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
ENDOFFILE
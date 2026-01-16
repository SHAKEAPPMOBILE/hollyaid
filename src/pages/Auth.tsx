import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isCompanyEmail, getEmailDomain } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, AlertCircle, CheckCircle2, Loader2, Stethoscope, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PlanSelection, { WELLNESS_PLANS, Plan } from '@/components/PlanSelection';
import { isTestAccountEmail } from '@/lib/plans';

type AuthView = 'main' | 'employee-login' | 'specialist-login' | 'company-login' | 'register' | 'forgot-password' | 'select-plan';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  
  const [view, setView] = useState<AuthView>('main');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [redirectingToPayment, setRedirectingToPayment] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);

  const validateCompanyEmail = (email: string) => {
    if (!email) {
      setEmailError('');
      return;
    }
    if (!isCompanyEmail(email)) {
      setEmailError('Please use your company email address (not Gmail, Yahoo, etc.)');
    } else {
      setEmailError('');
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setCompanyName('');
    setEmailError('');
    setResetEmailSent(false);
    setSelectedPlanId('');
    setRegisteredUserId(null);
  };

  const handleLogin = async (e: React.FormEvent, userType: 'employee' | 'specialist' | 'company') => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: { user: loggedInUser } } = await supabase.auth.getUser();
    
    if (loggedInUser) {
      if (userType === 'specialist') {
        const { data: specialist } = await supabase
          .from('specialists')
          .select('id')
          .eq('user_id', loggedInUser.id)
          .single();

        if (!specialist) {
          toast({
            title: "Access denied",
            description: "This account is not registered as a specialist.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        toast({
          title: "Welcome back!",
          description: "You've been logged in successfully.",
        });
        navigate('/specialist-dashboard');
      } else if (userType === 'company') {
        const { data: company } = await supabase
          .from('companies')
          .select('id, subscription_status')
          .eq('admin_user_id', loggedInUser.id)
          .single();

        if (!company) {
          toast({
            title: "Access denied",
            description: "This account is not registered as a company admin.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // If subscription is unpaid, show plan selection
        if (company.subscription_status === 'unpaid') {
          setRegisteredUserId(loggedInUser.id);
          setView('select-plan');
          setLoading(false);
          return;
        }

        toast({
          title: "Welcome back!",
          description: "You've been logged in successfully.",
        });
        navigate('/admin');
      } else {
        const { data: specialist } = await supabase
          .from('specialists')
          .select('id')
          .eq('user_id', loggedInUser.id)
          .single();

        if (specialist) {
          toast({
            title: "Wrong login",
            description: "Please use specialist login for your account.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        toast({
          title: "Welcome back!",
          description: "You've been logged in successfully.",
        });
        navigate('/dashboard');
      }
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setResetEmailSent(true);
      toast({
        title: "Email sent!",
        description: "Check your inbox for password reset instructions.",
      });
    }

    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isCompanyEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please use your company email address to register.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const { error: signUpError } = await signUp(email, password, fullName);
    
    if (signUpError) {
      toast({
        title: "Registration failed",
        description: signUpError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error: signInError } = await signIn(email, password);
    
    if (signInError) {
      toast({
        title: "Login failed after registration",
        description: signInError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: { user: newUser } } = await supabase.auth.getUser();
    
    if (newUser) {
      const domain = getEmailDomain(email);
      const { error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          email_domain: domain,
          admin_user_id: newUser.id,
          subscription_status: 'unpaid',
          is_test_account: isTestAccountEmail(email),
        });

      if (companyError) {
        toast({
          title: "Company creation failed",
          description: companyError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      await supabase
        .from('user_roles')
        .insert({
          user_id: newUser.id,
          role: 'company_admin',
        });

      setRegisteredUserId(newUser.id);
      setView('select-plan');
      toast({
        title: "Account created!",
        description: "Now choose your wellness minutes plan.",
      });
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
      
      // Test account - subscription activated without Stripe
      if (data?.isTestAccount) {
        toast({
          title: "Plan activated!",
          description: `Your ${plan.name} plan is now active with ${plan.minutes} minutes.`,
        });
        navigate('/admin');
        return;
      }

      // Regular account - redirect to Stripe
      if (data?.url) {
        setRedirectingToPayment(true);
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (checkoutError: any) {
      toast({
        title: "Payment setup failed",
        description: checkoutError.message || "Please try again later.",
        variant: "destructive",
      });
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

  const renderMainView = () => (
    <Card className="shadow-lg border-0">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">Welcome to HollyAid</CardTitle>
        <CardDescription className="text-muted-foreground">
          Your corporate wellness portal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          variant="wellness" 
          size="lg" 
          className="w-full"
          onClick={() => { resetForm(); setView('employee-login'); }}
        >
          <Users size={18} className="mr-2" />
          Employee Login
        </Button>
        
        <Button 
          variant="outline" 
          size="lg" 
          className="w-full"
          onClick={() => { resetForm(); setView('specialist-login'); }}
        >
          <Stethoscope size={18} className="mr-2" />
          Specialist Login
        </Button>
        
        <Button 
          variant="outline" 
          size="lg" 
          className="w-full"
          onClick={() => { resetForm(); setView('company-login'); }}
        >
          <Building2 size={18} className="mr-2" />
          Company Login
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button 
          variant="secondary" 
          size="lg" 
          className="w-full"
          onClick={() => { resetForm(); setView('register'); }}
        >
          <Building2 size={18} className="mr-2" />
          Register as Company
        </Button>

        <div className="pt-4 border-t mt-6">
          <p className="text-sm text-center text-muted-foreground mb-3">
            New employee? Join your company
          </p>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/employee-signup')}
          >
            Join Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderLoginForm = (userType: 'employee' | 'specialist' | 'company') => {
    const titles = {
      employee: 'Employee Login',
      specialist: 'Specialist Login',
      company: 'Company Login'
    };
    const descriptions = {
      employee: 'wellness portal',
      specialist: 'dashboard',
      company: 'admin dashboard'
    };
    
    return (
    <Card className="shadow-lg border-0">
      <CardHeader className="text-center pb-2 relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute left-4 top-4"
          onClick={() => { resetForm(); setView('main'); }}
        >
          <ArrowLeft size={16} className="mr-1" />
          Back
        </Button>
        <div className="pt-6">
          <CardTitle className="text-2xl font-bold">
            {titles[userType]}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to access your {descriptions[userType]}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => handleLogin(e, userType)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Password</Label>
              <Button 
                type="button"
                variant="link" 
                className="px-0 h-auto text-sm text-muted-foreground"
                onClick={() => setView('forgot-password')}
              >
                Forgot password?
              </Button>
            </div>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button 
            type="submit" 
            variant="wellness" 
            size="lg" 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
  };

  const renderForgotPassword = () => (
    <Card className="shadow-lg border-0">
      <CardHeader className="text-center pb-2 relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute left-4 top-4"
          onClick={() => { resetForm(); setView('main'); }}
        >
          <ArrowLeft size={16} className="mr-1" />
          Back
        </Button>
        <div className="pt-6">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription className="text-muted-foreground">
            {resetEmailSent 
              ? "Check your email for reset instructions" 
              : "Enter your email to receive a reset link"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {resetEmailSent ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
            <p className="text-muted-foreground">
              We've sent password reset instructions to <strong>{email}</strong>
            </p>
            <Button 
              variant="outline" 
              onClick={() => { resetForm(); setView('main'); }}
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              variant="wellness" 
              size="lg" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );

  const renderRegister = () => (
    <Card className="shadow-lg border-0">
      <CardHeader className="text-center pb-2 relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute left-4 top-4"
          onClick={() => { resetForm(); setView('main'); }}
        >
          <ArrowLeft size={16} className="mr-1" />
          Back
        </Button>
        <div className="pt-6">
          <CardTitle className="text-2xl font-bold">Register Your Company</CardTitle>
          <CardDescription className="text-muted-foreground">
            Create an account with your company email
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              type="text"
              placeholder="Acme Inc."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full-name">Your Full Name</Label>
            <Input
              id="full-name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-email">Company Email</Label>
            <Input
              id="register-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                validateCompanyEmail(e.target.value);
              }}
              className={emailError ? 'border-destructive' : ''}
              required
            />
            {emailError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle size={14} />
                {emailError}
              </p>
            )}
            {email && !emailError && isCompanyEmail(email) && (
              <p className="text-sm text-primary flex items-center gap-1">
                <CheckCircle2 size={14} />
                Valid company email
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password">Password</Label>
            <Input
              id="register-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button 
            type="submit" 
            variant="wellness" 
            size="lg" 
            className="w-full"
            disabled={loading || !!emailError}
          >
            {loading ? 'Creating Account...' : 'Continue to Plan Selection'}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Next, you'll choose your wellness minutes plan.
          </p>
        </form>
      </CardContent>
    </Card>
  );

  const renderPlanSelection = () => (
    <div className="w-full max-w-4xl">
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-4"
        onClick={() => { resetForm(); setView('main'); }}
      >
        <ArrowLeft size={16} className="mr-1" />
        Back to Login
      </Button>
      <PlanSelection 
        onSelectPlan={handlePlanSelect}
        loading={loading}
        selectedPlanId={selectedPlanId}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full py-6 px-8">
        <Logo size="md" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className={`animate-fade-up relative ${view === 'select-plan' ? 'w-full max-w-4xl' : 'w-full max-w-md'}`}>
          {view === 'main' && renderMainView()}
          {view === 'employee-login' && renderLoginForm('employee')}
          {view === 'specialist-login' && renderLoginForm('specialist')}
          {view === 'company-login' && renderLoginForm('company')}
          {view === 'forgot-password' && renderForgotPassword()}
          {view === 'register' && renderRegister()}
          {view === 'select-plan' && renderPlanSelection()}
        </div>
      </main>
    </div>
  );
};

export default Auth;

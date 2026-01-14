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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [emailError, setEmailError] = useState('');

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You've been logged in successfully.",
      });
      navigate('/dashboard');
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
    
    // First, sign up the user
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

    // Login after signup
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

    // Get the user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Create the company
      const domain = getEmailDomain(email);
      const { error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          email_domain: domain,
          admin_user_id: user.id,
        });

      if (companyError) {
        toast({
          title: "Company creation failed",
          description: companyError.message,
          variant: "destructive",
        });
      } else {
        // Add company_admin role
        await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'company_admin',
          });

        toast({
          title: "Welcome to WellnessHub!",
          description: "Your company has been registered. You can now invite employees.",
        });
        navigate('/dashboard');
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full py-6 px-8">
        <Logo size="md" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md animate-fade-up">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">
                {isLogin ? 'Welcome Back' : 'Register Your Company'}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {isLogin 
                  ? 'Sign in to access your wellness portal' 
                  : 'Create an account with your company email'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(v) => setIsLogin(v === 'login')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" className="flex items-center gap-2">
                    <Users size={16} />
                    Login
                  </TabsTrigger>
                  <TabsTrigger value="register" className="flex items-center gap-2">
                    <Building2 size={16} />
                    Register
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
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
                </TabsContent>

                <TabsContent value="register">
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
                      {loading ? 'Creating Account...' : 'Register Company'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      By registering, your company will have access to invite up to 100 employees.
                      A subscription fee applies.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Auth;

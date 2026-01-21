import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isCompanyEmail, getEmailDomain } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Users, AlertCircle, CheckCircle2, Building2, Phone } from 'lucide-react';

const EmployeeSignup: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [matchingCompany, setMatchingCompany] = useState<any>(null);
  const [checkingCompany, setCheckingCompany] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const checkCompanyDomain = async (email: string) => {
    if (!email || !email.includes('@')) {
      setMatchingCompany(null);
      return;
    }

    const domain = getEmailDomain(email);
    if (!domain) return;

    setCheckingCompany(true);

    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('email_domain', domain)
      .eq('subscription_status', 'active')
      .single();

    setMatchingCompany(data);
    setCheckingCompany(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!matchingCompany) {
      toast({
        title: "No matching company",
        description: "Your email domain is not registered with an active company subscription.",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number for notifications.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Sign up the user
      const { error: signUpError } = await signUp(email, password, fullName);
      
      if (signUpError) {
        throw signUpError;
      }

      // Sign in immediately
      const { user: newUser, error: signInError } = await signIn(email, password);
      
      if (signInError) {
        throw signInError;
      }

      if (newUser) {
        // Check if employee was pre-invited
        const { data: existingInvite } = await supabase
          .from('company_employees')
          .select('id')
          .eq('company_id', matchingCompany.id)
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (existingInvite) {
          // Update existing invitation record
          const { error: updateError } = await supabase
            .from('company_employees')
            .update({
              user_id: newUser.id,
              status: 'accepted',
              accepted_at: new Date().toISOString(),
            })
            .eq('id', existingInvite.id);

          if (updateError) {
            console.error('Error updating invitation:', updateError);
          }
        } else {
          // Auto-join the company (domain-based)
          const { error: joinError } = await supabase
            .from('company_employees')
            .insert({
              company_id: matchingCompany.id,
              email: email.toLowerCase(),
              user_id: newUser.id,
              status: 'accepted',
              accepted_at: new Date().toISOString(),
              auto_joined: true,
            });

          if (joinError && !joinError.message.includes('duplicate')) {
            console.error('Error joining company:', joinError);
          }
        }

        // Add employee role
        await supabase
          .from('user_roles')
          .insert({
            user_id: newUser.id,
            role: 'employee',
          });

        // Update profile with phone number
        await supabase
          .from('profiles')
          .update({ phone_number: phoneNumber.trim() })
          .eq('user_id', newUser.id);

        toast({
          title: "Welcome to HollyAid!",
          description: `You've been added to ${matchingCompany.name}. Let's complete your profile.`,
        });
        navigate('/complete-profile');
      }
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full py-6 px-8">
        <Logo size="md" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md animate-fade-up">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Employee Sign Up</CardTitle>
              <CardDescription>
                Join your company's wellness program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
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
                  <Label htmlFor="email">Work Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      checkCompanyDomain(e.target.value);
                    }}
                    required
                  />
                  {checkingCompany && (
                    <p className="text-sm text-muted-foreground">Checking company...</p>
                  )}
                  {!checkingCompany && email && matchingCompany && (
                    <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-md">
                      <Building2 className="text-primary" size={16} />
                      <span className="text-sm text-primary font-medium">
                        You'll be added to {matchingCompany.name}
                      </span>
                    </div>
                  )}
                  {!checkingCompany && email && email.includes('@') && !matchingCompany && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle size={14} />
                      No active company found for this email domain
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone size={16} />
                    Phone / WhatsApp Number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll send you WhatsApp/SMS notifications for booking updates.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
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
                  disabled={loading || !matchingCompany}
                >
                  {loading ? 'Creating Account...' : 'Join Company'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Already have an account?{' '}
                  <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/auth')}>
                    Sign in
                  </Button>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default EmployeeSignup;

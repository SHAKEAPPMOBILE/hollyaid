import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const SpecialistSignup: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  const token = searchParams.get('token');
  const emailFromUrl = searchParams.get('email');

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [specialistData, setSpecialistData] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setIsValid(false);
      setValidating(false);
      return;
    }

    const { data, error } = await supabase
      .from('specialists')
      .select('*')
      .eq('invitation_token', token)
      .is('user_id', null)
      .single();

    if (error || !data) {
      setIsValid(false);
    } else {
      setIsValid(true);
      setSpecialistData(data);
    }
    setValidating(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Sign up the specialist
      const { error: signUpError } = await signUp(specialistData.email, password, specialistData.full_name);
      
      if (signUpError) {
        throw signUpError;
      }

      // Sign in immediately
      const { error: signInError } = await signIn(specialistData.email, password);
      
      if (signInError) {
        throw signInError;
      }

      // Get the user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update specialist with user_id
        const { error: updateError } = await supabase
          .from('specialists')
          .update({
            user_id: user.id,
            invitation_accepted_at: new Date().toISOString(),
          })
          .eq('id', specialistData.id);

        if (updateError) {
          console.error('Error updating specialist:', updateError);
        }

        // Add specialist role
        await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'specialist',
          });

        toast({
          title: "Welcome to WellnessHub!",
          description: "Your specialist account has been created. You can now set your availability.",
        });
        navigate('/specialist-dashboard');
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

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary">Validating invitation...</div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="w-full py-6 px-8">
          <Logo size="md" />
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <CardTitle>Invalid Invitation</CardTitle>
              <CardDescription>
                This invitation link is invalid or has already been used.
                Please contact the administrator for a new invitation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full py-6 px-8">
        <Logo size="md" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md animate-fade-up">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">Welcome, {specialistData?.full_name}!</CardTitle>
              <CardDescription>
                Create your password to access your specialist dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <CheckCircle2 className="text-primary" size={16} />
                    <span className="text-sm">{specialistData?.email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Specialty</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <span className="text-sm">{specialistData?.specialty}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Create Password</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button 
                  type="submit" 
                  variant="wellness" 
                  size="lg" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SpecialistSignup;

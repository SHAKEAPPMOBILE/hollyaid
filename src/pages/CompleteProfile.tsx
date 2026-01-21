import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, Briefcase, Loader2, Phone } from 'lucide-react';

const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      checkProfileCompletion();
    }
  }, [user, authLoading, navigate]);

  const checkProfileCompletion = async () => {
    if (!user) return;

    const { data }: any = await supabase
      .from('profiles' as any)
      .select('full_name, job_title, phone_number')
      .eq('user_id', user.id)
      .single();

    const profile = data as { full_name: string | null; job_title: string | null; phone_number: string | null } | null;

    // If profile already has job_title and phone_number set, redirect to appropriate dashboard
    if (profile?.job_title && profile?.phone_number) {
      redirectToDashboard();
      return;
    }

    // Pre-fill fields if available
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
    if (profile?.job_title) {
      setJobTitle(profile.job_title);
    }
    if (profile?.phone_number) {
      setPhoneNumber(profile.phone_number);
    }

    setCheckingProfile(false);
  };

  const redirectToDashboard = async () => {
    if (!user) return;

    // Check user role to redirect appropriately
    const { data: specialist } = await supabase
      .from('specialists')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (specialist) {
      navigate('/specialist-dashboard');
      return;
    }

    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('admin_user_id', user.id)
      .single();

    if (company) {
      navigate('/admin');
      return;
    }

    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!fullName.trim() || !jobTitle.trim() || !phoneNumber.trim()) {
      toast({
        title: "Please fill in all fields",
        description: "Name, job title, and phone number are required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('profiles' as any)
      .update({
        full_name: fullName.trim(),
        job_title: jobTitle.trim(),
        phone_number: phoneNumber.trim(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: "Profile completed!",
      description: "Welcome to HollyAid.",
    });

    redirectToDashboard();
  };

  if (authLoading || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-wellness-50 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo size="md" />
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
            <CardDescription className="text-muted-foreground">
              Tell us a bit more about yourself
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User size={16} className="text-muted-foreground" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="flex items-center gap-2">
                  <Briefcase size={16} className="text-muted-foreground" />
                  Job Title
                </Label>
                <Input
                  id="jobTitle"
                  type="text"
                  placeholder="e.g. Software Engineer, Marketing Manager"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                  <Phone size={16} className="text-muted-foreground" />
                  WhatsApp or Phone Number *
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  We'll notify you via WhatsApp or SMS for booking updates.
                </p>
              </div>

              <Button
                type="submit"
                variant="wellness"
                size="lg"
                className="w-full mt-6"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompleteProfile;

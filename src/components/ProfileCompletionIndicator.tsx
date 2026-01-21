import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, AlertCircle, Mail, XCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileField {
  key: string;
  label: string;
  required: boolean;
  isEmailVerification?: boolean;
}

const PROFILE_FIELDS: ProfileField[] = [
  { key: 'email_verified', label: 'Email Verified', required: true, isEmailVerification: true },
  { key: 'full_name', label: 'Full Name', required: true },
  { key: 'job_title', label: 'Job Title', required: true },
  { key: 'phone_number', label: 'Phone Number', required: true },
  { key: 'department', label: 'Department', required: false },
  { key: 'avatar_url', label: 'Profile Photo', required: false },
];

interface ProfileCompletionIndicatorProps {
  isSpecialist?: boolean;
}

const ProfileCompletionIndicator: React.FC<ProfileCompletionIndicatorProps> = ({ isSpecialist = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [specialistProfile, setSpecialistProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [justVerified, setJustVerified] = useState(false);
  const previousEmailVerified = useRef<boolean | null>(null);

  const isEmailVerified = !!user?.email_confirmed_at;

  // Auto-refresh detection for email verification
  useEffect(() => {
    // Check if email was just verified (was false, now true)
    if (previousEmailVerified.current === false && isEmailVerified) {
      setJustVerified(true);
      toast({
        title: "Email Verified!",
        description: "Your email has been successfully verified.",
      });
      
      // Hide the success message after 5 seconds
      const timer = setTimeout(() => {
        setJustVerified(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
    
    previousEmailVerified.current = isEmailVerified;
  }, [isEmailVerified, toast]);

  // Poll for auth state changes when email is unverified
  useEffect(() => {
    if (isEmailVerified) return;

    const pollInterval = setInterval(async () => {
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      if (refreshedUser?.email_confirmed_at && !isEmailVerified) {
        // Trigger a session refresh to update the auth context
        await supabase.auth.refreshSession();
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [isEmailVerified]);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setProfile(profileData);

      if (isSpecialist) {
        const { data: specData } = await supabase
          .from('specialists')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        setSpecialistProfile(specData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!user?.email) return;
    
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      
      if (error) throw error;
      
      toast({
        title: "Verification email sent",
        description: "Please check your inbox and spam folder.",
      });
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const getFieldsToCheck = (): ProfileField[] => {
    const fields = [...PROFILE_FIELDS];
    
    if (isSpecialist) {
      fields.push(
        { key: 'bio', label: 'Bio', required: false },
      );
    }
    
    return fields;
  };

  const isFieldComplete = (field: ProfileField): boolean => {
    if (field.isEmailVerification) {
      return isEmailVerified;
    }
    
    const dataSource = isSpecialist ? { ...profile, ...specialistProfile } : profile;
    const value = dataSource?.[field.key];
    return value && (typeof value !== 'string' || value.trim() !== '');
  };

  const getMissingFields = (): ProfileField[] => {
    if (!profile && !user) return getFieldsToCheck();

    const fields = getFieldsToCheck();
    return fields.filter(field => !isFieldComplete(field));
  };

  const getCompletedFields = (): ProfileField[] => {
    if (!profile && !user) return [];

    const fields = getFieldsToCheck();
    return fields.filter(field => isFieldComplete(field));
  };

  const calculateCompletionPercentage = (): number => {
    const fields = getFieldsToCheck();
    const completed = getCompletedFields();
    return Math.round((completed.length / fields.length) * 100);
  };

  if (loading) {
    return null;
  }

  const missingFields = getMissingFields();
  const completionPercentage = calculateCompletionPercentage();
  const isComplete = missingFields.length === 0;
  const hasMissingRequired = missingFields.some(f => f.required);
  const hasUnverifiedEmail = missingFields.some(f => f.isEmailVerification);

  // Show success message when email was just verified
  if (justVerified) {
    return (
      <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-700 dark:text-green-300">
                Email Verified Successfully!
              </h4>
              <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-0.5">
                Thank you for verifying your email address.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if profile is complete
  if (isComplete) {
    return null;
  }

  return (
    <Card className={hasMissingRequired ? 'border-destructive/50 bg-destructive/5' : 'border-primary/30 bg-primary/5'}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg ${hasMissingRequired ? 'bg-destructive/10' : 'bg-primary/10'}`}>
            {hasUnverifiedEmail ? (
              <Mail className="h-5 w-5 text-destructive" />
            ) : hasMissingRequired ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-foreground">
                {hasUnverifiedEmail 
                  ? 'Verify Your Email' 
                  : hasMissingRequired 
                    ? 'Complete Your Profile' 
                    : 'Almost There!'}
              </h4>
              <span className="text-sm font-medium text-muted-foreground">
                {completionPercentage}%
              </span>
            </div>
            
            <Progress 
              value={completionPercentage} 
              className="h-2 mb-3"
            />
            
            <div className="flex flex-wrap gap-1.5 mb-3">
              {missingFields.map(field => (
                <Badge 
                  key={field.key} 
                  variant={field.required ? 'destructive' : 'secondary'}
                  className="text-xs flex items-center gap-1"
                >
                  {field.isEmailVerification && <XCircle className="h-3 w-3" />}
                  {field.label}
                  {field.required && !field.isEmailVerification && ' *'}
                </Badge>
              ))}
            </div>

            {hasUnverifiedEmail && (
              <p className="text-xs text-muted-foreground mb-3">
                Check your inbox for a verification email. Didn't receive it? Check your spam folder.
              </p>
            )}
            
            <div className="flex flex-wrap gap-2">
              {hasUnverifiedEmail && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleResendVerificationEmail}
                  disabled={resendingEmail}
                  className="w-full sm:w-auto"
                >
                  {resendingEmail ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-1" />
                  )}
                  Resend Verification Email
                </Button>
              )}
              
              <Button 
                size="sm" 
                variant={hasMissingRequired && !hasUnverifiedEmail ? 'default' : 'outline'}
                onClick={() => navigate('/settings')}
                className="w-full sm:w-auto"
              >
                Complete Profile
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCompletionIndicator;

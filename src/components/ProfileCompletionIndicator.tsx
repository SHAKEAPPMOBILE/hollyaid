import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProfileField {
  key: string;
  label: string;
  required: boolean;
}

const PROFILE_FIELDS: ProfileField[] = [
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
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [specialistProfile, setSpecialistProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getFieldsToCheck = (): ProfileField[] => {
    const fields = [...PROFILE_FIELDS];
    
    if (isSpecialist) {
      fields.push(
        { key: 'bio', label: 'Bio', required: false },
      );
    }
    
    return fields;
  };

  const getMissingFields = (): ProfileField[] => {
    if (!profile) return getFieldsToCheck();

    const fields = getFieldsToCheck();
    const dataSource = isSpecialist ? { ...profile, ...specialistProfile } : profile;

    return fields.filter(field => {
      const value = dataSource?.[field.key];
      return !value || (typeof value === 'string' && value.trim() === '');
    });
  };

  const getCompletedFields = (): ProfileField[] => {
    if (!profile) return [];

    const fields = getFieldsToCheck();
    const dataSource = isSpecialist ? { ...profile, ...specialistProfile } : profile;

    return fields.filter(field => {
      const value = dataSource?.[field.key];
      return value && (typeof value !== 'string' || value.trim() !== '');
    });
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

  // Don't show if profile is complete
  if (isComplete) {
    return null;
  }

  return (
    <Card className={hasMissingRequired ? 'border-destructive/50 bg-destructive/5' : 'border-primary/30 bg-primary/5'}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg ${hasMissingRequired ? 'bg-destructive/10' : 'bg-primary/10'}`}>
            {hasMissingRequired ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-foreground">
                {hasMissingRequired ? 'Complete Your Profile' : 'Almost There!'}
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
                  className="text-xs"
                >
                  {field.label}
                  {field.required && ' *'}
                </Badge>
              ))}
            </div>
            
            <Button 
              size="sm" 
              variant={hasMissingRequired ? 'default' : 'outline'}
              onClick={() => navigate('/settings')}
              className="w-full sm:w-auto"
            >
              Complete Profile
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCompletionIndicator;

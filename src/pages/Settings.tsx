import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Phone, Bell, Save, Loader2, User, Briefcase, Building2 } from 'lucide-react';

type NotificationPreference = 'email' | 'whatsapp' | 'both';

interface ProfileData {
  full_name: string;
  email: string;
  phone_number: string;
  job_title: string;
  department: string;
  notification_preference: NotificationPreference;
}

interface SpecialistData {
  full_name: string;
  email: string;
  phone_number: string;
  specialty: string;
  bio: string;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [notificationPreference, setNotificationPreference] = useState<NotificationPreference>('both');

  // Specialist-specific fields
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [specialistId, setSpecialistId] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchUserData();
    }
  }, [user, authLoading, navigate]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone_number, job_title, department, notification_preference')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setFullName(profileData.full_name || '');
        setEmail(profileData.email || '');
        setPhoneNumber(profileData.phone_number || '');
        setJobTitle(profileData.job_title || '');
        setDepartment(profileData.department || '');
        setNotificationPreference((profileData.notification_preference as NotificationPreference) || 'both');
      }

      // Check if user is a specialist
      const { data: specialistData } = await supabase
        .from('specialists')
        .select('id, full_name, email, phone_number, specialty, bio')
        .eq('user_id', user.id)
        .single();

      if (specialistData) {
        setIsSpecialist(true);
        setSpecialistId(specialistData.id);
        // Prefer specialist data for these fields if available
        setFullName(specialistData.full_name || profileData?.full_name || '');
        setPhoneNumber(specialistData.phone_number || profileData?.phone_number || '');
        setSpecialty(specialistData.specialty || '');
        setBio(specialistData.bio || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate required fields
    if (!fullName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number if WhatsApp is selected
    if ((notificationPreference === 'whatsapp' || notificationPreference === 'both') && !phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number to receive WhatsApp notifications.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim() || null,
          job_title: jobTitle.trim() || null,
          department: department.trim() || null,
          notification_preference: notificationPreference,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update specialist data if applicable
      if (isSpecialist && specialistId) {
        const { error: specialistError } = await supabase
          .from('specialists')
          .update({
            full_name: fullName.trim(),
            phone_number: phoneNumber.trim() || null,
            specialty: specialty.trim(),
            bio: bio.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', specialistId);

        if (specialistError) throw specialistError;
      }

      toast({
        title: "Settings saved",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Logo size="sm" />
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and notification preferences</p>
        </div>

        <div className="space-y-6">
          {/* Personal Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={20} />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Information Card (for employees/admins) */}
          {!isSpecialist && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase size={20} />
                  Work Information
                </CardTitle>
                <CardDescription>
                  Your role and department details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      type="text"
                      placeholder="Software Engineer"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      type="text"
                      placeholder="Engineering"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Specialist Information Card */}
          {isSpecialist && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 size={20} />
                  Professional Profile
                </CardTitle>
                <CardDescription>
                  Your specialist profile visible to employees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty *</Label>
                  <Input
                    id="specialty"
                    type="text"
                    placeholder="e.g., Counselling, Life Coaching"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell employees about your experience and approach..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be displayed on your public profile
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone size={20} />
                Contact Information
              </CardTitle>
              <CardDescription>
                Your phone number is used for WhatsApp/SMS notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp or Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Include country code for international numbers
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell size={20} />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to receive booking notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={notificationPreference}
                onValueChange={(value) => setNotificationPreference(value as NotificationPreference)}
                className="space-y-4"
              >
                <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="both" id="both" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="both" className="text-base font-medium cursor-pointer">
                      Email + WhatsApp (Recommended)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Get notified via both email and WhatsApp for maximum reliability
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="email" id="email" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="email" className="text-base font-medium cursor-pointer">
                      Email Only
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Receive all notifications via email
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="whatsapp" id="whatsapp" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="whatsapp" className="text-base font-medium cursor-pointer">
                      WhatsApp/SMS Only
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Receive instant notifications on your phone (requires phone number)
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Settings;

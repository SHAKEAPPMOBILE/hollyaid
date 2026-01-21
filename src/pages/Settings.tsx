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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Phone, Bell, Save, Loader2 } from 'lucide-react';

type NotificationPreference = 'email' | 'whatsapp' | 'both';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [notificationPreference, setNotificationPreference] = useState<NotificationPreference>('both');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('phone_number, notification_preference')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setPhoneNumber(data.phone_number || '');
        setNotificationPreference((data.notification_preference as NotificationPreference) || 'both');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

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
      const { error } = await supabase
        .from('profiles')
        .update({
          phone_number: phoneNumber.trim() || null,
          notification_preference: notificationPreference,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
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
          <p className="text-muted-foreground mt-1">Manage your account and notification preferences</p>
        </div>

        <div className="space-y-6">
          {/* Phone Number Card */}
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

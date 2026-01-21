import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LogOut, MessageSquare, History, User } from 'lucide-react';
import SpecialistBookingRequests from '@/components/SpecialistBookingRequests';
import SpecialistBookingHistory from '@/components/SpecialistBookingHistory';
import ProfileCompletionIndicator from '@/components/ProfileCompletionIndicator';
import OnboardingTour, { TourStep } from '@/components/OnboardingTour';

const SPECIALIST_TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to HollyAid! 🎉",
    description: "We're thrilled to have you as a wellness specialist. Let us show you how to manage your bookings and connect with clients.",
    position: 'center',
  },
  {
    target: '[data-tour="pending-requests"]',
    title: "Pending Requests",
    description: "This shows how many booking requests are waiting for your response. Stay on top of these to provide great service!",
    position: 'bottom',
  },
  {
    target: '[data-tour="requests-tab"]',
    title: "Booking Requests",
    description: "View and manage incoming session requests here. You can accept, decline, or propose alternative times.",
    position: 'bottom',
  },
  {
    target: '[data-tour="history-tab"]',
    title: "Booking History",
    description: "Track all your past and completed sessions. Great for keeping records and following up with clients.",
    position: 'bottom',
  },
  {
    target: '[data-tour="profile-button"]',
    title: "Your Profile",
    description: "Keep your profile up to date! A complete profile with a photo helps clients feel confident booking with you.",
    position: 'bottom',
  },
];

interface Specialist {
  id: string;
  full_name: string;
  email: string;
  specialty: string;
  hourly_rate: number;
}

const SpecialistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();

  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      checkSpecialistAccess();
    }
  }, [user, authLoading, navigate]);

  const checkSpecialistAccess = async () => {
    if (!user) return;

    const { data: specData } = await supabase
      .from('specialists')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (specData) {
      setSpecialist(specData as Specialist);
      fetchPendingBookingsCount(specData.id);
    } else {
      toast({
        title: "Access denied",
        description: "You don't have specialist privileges.",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const fetchPendingBookingsCount = async (specialistId: string) => {
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('specialist_id', specialistId)
      .eq('status', 'pending');
    
    setPendingBookingsCount(count || 0);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary">Loading...</div>
      </div>
    );
  }

  if (!specialist) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings')} data-tour="profile-button">
            <User size={16} />
            <span className="hidden sm:inline">My Profile</span>
          </Button>
          <Logo size="sm" />
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Onboarding Tour */}
        <OnboardingTour 
          steps={SPECIALIST_TOUR_STEPS}
          tourKey="specialist-dashboard"
        />

        {/* Profile Completion Indicator */}
        <div className="mb-6">
          <ProfileCompletionIndicator isSpecialist />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome, {specialist.full_name}</h1>
          <p className="text-muted-foreground mt-1">{specialist.specialty} • ${specialist.hourly_rate}/hour</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className={pendingBookingsCount > 0 ? 'ring-2 ring-primary' : ''} data-tour="pending-requests">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <MessageSquare className="text-primary" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingBookingsCount}</p>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Requests and History */}
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests" className="flex items-center gap-2" data-tour="requests-tab">
              <MessageSquare size={16} />
              Booking Requests
              {pendingBookingsCount > 0 && (
                <Badge className="ml-1 bg-primary text-primary-foreground">{pendingBookingsCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2" data-tour="history-tab">
              <History size={16} />
              Booking History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <SpecialistBookingRequests
              specialistId={specialist.id}
              onBookingUpdate={() => fetchPendingBookingsCount(specialist.id)}
            />
          </TabsContent>

          <TabsContent value="history">
            <SpecialistBookingHistory specialistId={specialist.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SpecialistDashboard;

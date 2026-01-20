import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LogOut, MessageSquare } from 'lucide-react';
import SpecialistBookingRequests from '@/components/SpecialistBookingRequests';

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
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {specialist.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut size={16} />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome, {specialist.full_name}</h1>
          <p className="text-muted-foreground mt-1">{specialist.specialty} • ${specialist.hourly_rate}/hour</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className={pendingBookingsCount > 0 ? 'ring-2 ring-primary' : ''}>
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

        {/* Booking Requests */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Booking Requests</h2>
            {pendingBookingsCount > 0 && (
              <Badge className="bg-primary text-primary-foreground">{pendingBookingsCount}</Badge>
            )}
          </div>
          <SpecialistBookingRequests
            specialistId={specialist.id}
            onBookingUpdate={() => fetchPendingBookingsCount(specialist.id)}
          />
        </div>
      </main>
    </div>
  );
};

export default SpecialistDashboard;

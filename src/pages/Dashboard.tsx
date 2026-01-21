import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Calendar, Settings as SettingsIcon, LogOut, UserPlus, 
  Clock, CheckCircle, XCircle, Video, BarChart3, User
} from 'lucide-react';
import SpecialistsGrid from '@/components/SpecialistsGrid';
import EmployeeManagement from '@/components/EmployeeManagement';
import BookingsList from '@/components/BookingsList';
import MinutesUsageTracker from '@/components/MinutesUsageTracker';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  email_domain: string;
  is_paid: boolean;
  max_employees: number;
  plan_type: string | null;
  minutes_included: number | null;
  minutes_used: number | null;
  subscription_period_end: string | null;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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
      // Check if user is admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!adminRole);

      // Check if user is company admin
      const { data: companyAdminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'company_admin')
        .single();

      setIsCompanyAdmin(!!companyAdminRole);

      // Fetch company if user is company admin
      if (companyAdminRole) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('admin_user_id', user.id)
          .single();

        setCompany(companyData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You've been logged out successfully.",
    });
    navigate('/');
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
        <div className="container flex h-16 items-center relative">
          <div className="flex-1 flex justify-center">
            <Logo size="sm" />
          </div>
          <div className="absolute right-4 flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/settings')}
            >
              <User size={16} />
              My Profile
            </Button>
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/admin')}
              >
                <SettingsIcon size={16} />
                Admin
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut size={16} />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {company ? `${company.name} Dashboard` : 'Your Wellness Portal'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isCompanyAdmin 
              ? 'Manage your team and view specialists' 
              : 'Browse specialists and manage your bookings'}
          </p>
        </div>

        <Tabs defaultValue={isCompanyAdmin ? "usage" : "specialists"} className="space-y-6">
          <TabsList className="bg-secondary/50">
            {isCompanyAdmin && (
              <TabsTrigger value="usage" className="flex items-center gap-2">
                <BarChart3 size={16} />
                Usage
              </TabsTrigger>
            )}
            <TabsTrigger value="specialists" className="flex items-center gap-2">
              <Users size={16} />
              Specialists
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar size={16} />
              My Bookings
            </TabsTrigger>
            {isCompanyAdmin && (
              <TabsTrigger value="employees" className="flex items-center gap-2">
                <UserPlus size={16} />
                Employees
              </TabsTrigger>
            )}
          </TabsList>

          {isCompanyAdmin && company && (
            <TabsContent value="usage" className="animate-fade-in">
              <MinutesUsageTracker company={company} />
            </TabsContent>
          )}

          <TabsContent value="specialists" className="animate-fade-in">
            <SpecialistsGrid />
          </TabsContent>

          <TabsContent value="bookings" className="animate-fade-in">
            <BookingsList />
          </TabsContent>

          {isCompanyAdmin && company && (
            <TabsContent value="employees" className="animate-fade-in">
              <EmployeeManagement company={company} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;

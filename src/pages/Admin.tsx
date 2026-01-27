import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, Plus, Users, 
  Edit, Trash2, UserPlus, Clock
} from 'lucide-react';
import AdminActivityLog from '@/components/AdminActivityLog';
import AdminPayoutRequests from '@/components/AdminPayoutRequests';
import SpecialistFormDialog from '@/components/SpecialistFormDialog';

interface Specialist {
  id: string;
  full_name: string;
  email: string;
  specialty: string;
  bio: string | null;
  hourly_rate: number;
  is_active: boolean;
  avatar_url: string | null;
  user_id: string | null;
  rate_tier: string | null;
  website?: string | null;
}

// Only these emails can invite specialists
const ALLOWED_INVITE_EMAILS = ['info@hollyaid.com', 'contact@shakeapp.today'];

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingSpecialist, setEditingSpecialist] = useState<Specialist | null>(null);
  
  // Check if current user can invite specialists
  const canInviteSpecialists = user?.email && ALLOWED_INVITE_EMAILS.includes(user.email.toLowerCase());

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      checkAdminAccess();
    }
  }, [user, authLoading, navigate]);

  const checkAdminAccess = async () => {
    if (!user) return;

    // Check for admin role in database
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    // Platform admins (fallback for designated emails)
    const isPlatformAdmin = user.email && ALLOWED_INVITE_EMAILS.includes(user.email.toLowerCase());

    if (data || isPlatformAdmin) {
      setIsAdmin(true);
      fetchSpecialists();
    } else {
      toast({
        title: "Access denied",
        description: "You don't have admin privileges.",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const fetchSpecialists = async () => {
    const { data, error } = await supabase
      .from('specialists')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSpecialists(data);
    }
  };

  // Log admin activity and send notifications for critical actions
  const logActivity = async (
    actionType: string,
    targetType: string,
    targetId: string | null,
    targetName: string | null,
    details?: Record<string, any>
  ) => {
    if (!user) return;
    
    // Log to database
    await supabase.from('admin_activity_logs').insert({
      admin_user_id: user.id,
      admin_email: user.email || 'unknown',
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      target_name: targetName,
      details: details || null,
    });

    // Send email notification for critical actions
    const criticalActions = ['delete', 'deactivate'];
    if (criticalActions.includes(actionType)) {
      try {
        await supabase.functions.invoke('notify-admin-action', {
          body: {
            actionType: `${actionType}_${targetType}`,
            targetType,
            targetName,
            adminEmail: user.email || 'unknown',
            details,
          },
        });
      } catch (error) {
        console.error('Failed to send admin action notification:', error);
      }
    }
  };

  const toggleSpecialistStatus = async (id: string, currentStatus: boolean, specialistName: string) => {
    const { error } = await supabase
      .from('specialists')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      // Log the action
      await logActivity(
        currentStatus ? 'deactivate' : 'activate',
        'specialist',
        id,
        specialistName
      );
      
      fetchSpecialists();
      toast({
        title: currentStatus ? "Specialist deactivated" : "Specialist activated",
      });
    }
  };

  const deleteSpecialist = async (id: string, specialistName: string) => {
    const { error } = await supabase
      .from('specialists')
      .delete()
      .eq('id', id);

    if (!error) {
      // Log the delete action
      await logActivity('delete', 'specialist', id, specialistName);
      
      fetchSpecialists();
      toast({
        title: "Specialist removed",
      });
    }
  };

  const handleAddClick = () => {
    setEditingSpecialist(null);
    setShowFormDialog(true);
  };

  const handleEditClick = (specialist: Specialist) => {
    setEditingSpecialist(specialist);
    setShowFormDialog(true);
  };

  const handleFormClose = (open: boolean) => {
    if (!open) {
      setEditingSpecialist(null);
    }
    setShowFormDialog(open);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center relative">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="absolute left-4">
            <ArrowLeft size={16} />
            Back
          </Button>
          <div className="flex-1 flex justify-center">
            <Logo size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Manage specialists and platform settings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="text-primary" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{specialists.length}</p>
                  <p className="text-sm text-muted-foreground">Total Specialists</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <UserPlus className="text-primary" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {specialists.filter(s => s.is_active).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Specialists</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-secondary">
                  <Clock className="text-muted-foreground" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {specialists.filter(s => !s.is_active).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Inactive Specialists</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Specialists Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Specialists</CardTitle>
              <CardDescription>Manage wellness specialists on the platform</CardDescription>
            </div>
            <Button variant="wellness" onClick={handleAddClick}>
              <Plus size={16} />
              Add Specialist
            </Button>
          </CardHeader>
          <CardContent>
            {specialists.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No specialists added yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Specialist</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialists.map((specialist) => (
                    <TableRow key={specialist.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={specialist.avatar_url || undefined} />
                            <AvatarFallback>
                              {specialist.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{specialist.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{specialist.email}</TableCell>
                      <TableCell>{specialist.specialty}</TableCell>
                      <TableCell>
                        {specialist.user_id ? (
                          <span className="font-medium">${specialist.hourly_rate}/hr</span>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Pending signup</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={specialist.is_active}
                          onCheckedChange={() => toggleSpecialistStatus(specialist.id, specialist.is_active, specialist.full_name)}
                        />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(specialist)}
                        >
                          <Edit size={14} />
                          Edit
                        </Button>
                        {canInviteSpecialists && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const { data, error } = await supabase.functions.invoke('invite-specialist', {
                                body: { specialistId: specialist.id }
                              });
                              if (error) {
                                toast({ title: "Failed to send invitation", description: error.message, variant: "destructive" });
                              } else {
                                // Log the invite action
                                await logActivity('invite', 'specialist', specialist.id, specialist.full_name, { email: specialist.email });
                                toast({ title: "Invitation sent!", description: data.invitationLink ? `Link: ${data.invitationLink}` : data.message });
                              }
                            }}
                            disabled={!!specialist.user_id}
                          >
                            <UserPlus size={14} />
                            {specialist.user_id ? 'Registered' : 'Invite'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => deleteSpecialist(specialist.id, specialist.full_name)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payout Requests & Activity Log - only visible to authorized emails */}
        {canInviteSpecialists && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdminPayoutRequests />
            <AdminActivityLog />
          </div>
        )}
      </main>

      {/* Specialist Form Dialog (Add/Edit) */}
      <SpecialistFormDialog
        open={showFormDialog}
        onOpenChange={handleFormClose}
        specialist={editingSpecialist}
        onSuccess={fetchSpecialists}
        onLogActivity={logActivity}
      />
    </div>
  );
};

export default Admin;

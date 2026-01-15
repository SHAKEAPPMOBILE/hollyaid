import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Plus, Trash2, LogOut, CalendarDays } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';

interface AvailabilitySlot {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

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
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New slot form
  const [slotDate, setSlotDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

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
      setSpecialist(specData);
      fetchSlots(specData.id);
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

  const fetchSlots = async (specialistId: string) => {
    const { data, error } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('specialist_id', specialistId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (!error && data) {
      setSlots(data);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialist) return;

    setSubmitting(true);

    const startDateTime = new Date(`${slotDate}T${startTime}`);
    const endDateTime = new Date(`${slotDate}T${endTime}`);

    if (endDateTime <= startDateTime) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('availability_slots')
      .insert({
        specialist_id: specialist.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        is_booked: false,
      });

    if (error) {
      toast({
        title: "Failed to add slot",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Slot added",
        description: "Your availability slot has been added.",
      });
      setSlotDate('');
      setStartTime('');
      setEndTime('');
      fetchSlots(specialist.id);
    }

    setSubmitting(false);
  };

  const handleDeleteSlot = async (slotId: string) => {
    const { error } = await supabase
      .from('availability_slots')
      .delete()
      .eq('id', slotId);

    if (!error && specialist) {
      fetchSlots(specialist.id);
      toast({
        title: "Slot deleted",
      });
    }
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

  // Get minimum date (today)
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <CalendarDays className="text-primary" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{slots.length}</p>
                  <p className="text-sm text-muted-foreground">Available Slots</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Calendar className="text-primary" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{slots.filter(s => s.is_booked).length}</p>
                  <p className="text-sm text-muted-foreground">Booked Sessions</p>
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
                  <p className="text-2xl font-bold">{slots.filter(s => !s.is_booked).length}</p>
                  <p className="text-sm text-muted-foreground">Open Slots</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Add Slot Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus size={20} />
                Add Availability
              </CardTitle>
              <CardDescription>Set your available consultation times</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSlot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    min={today}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Time</Label>
                    <Input
                      id="start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End Time</Label>
                    <Input
                      id="end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" variant="wellness" className="w-full" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Slot'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Slots List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Your Availability Slots</CardTitle>
              <CardDescription>Upcoming consultation slots</CardDescription>
            </CardHeader>
            <CardContent>
              {slots.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No availability slots set yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell>
                          {format(parseISO(slot.start_time), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {format(parseISO(slot.start_time), 'h:mm a')} - {format(parseISO(slot.end_time), 'h:mm a')}
                        </TableCell>
                        <TableCell>
                          {slot.is_booked ? (
                            <Badge className="bg-primary">Booked</Badge>
                          ) : (
                            <Badge variant="secondary">Available</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!slot.is_booked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteSlot(slot.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SpecialistDashboard;

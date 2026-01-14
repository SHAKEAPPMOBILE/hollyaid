import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Video, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Booking {
  id: string;
  status: string;
  zoom_link: string | null;
  notes: string | null;
  created_at: string;
  slot_id: string;
  slot: {
    start_time: string;
    end_time: string;
  } | null;
  specialist: {
    full_name: string;
    specialty: string;
    hourly_rate: number;
  } | null;
}

const BookingsList: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        zoom_link,
        notes,
        created_at,
        slot_id,
        slot:availability_slots(start_time, end_time),
        specialist:specialists(full_name, specialty, hourly_rate)
      `)
      .eq('employee_user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Transform the data to handle the joined tables
      const transformedData = data.map((item: any) => ({
        ...item,
        slot: item.slot,
        specialist: item.specialist
      }));
      setBookings(transformedData);
    }
    setLoading(false);
  };

  const cancelBooking = async (bookingId: string, slotId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (error) {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Free up the slot
    await supabase
      .from('availability_slots')
      .update({ is_booked: false })
      .eq('id', slotId);

    toast({
      title: "Booking cancelled",
      description: "Your booking has been cancelled.",
    });

    fetchBookings();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock size={12} /> Pending</Badge>;
      case 'approved':
        return <Badge className="bg-primary flex items-center gap-1"><CheckCircle size={12} /> Approved</Badge>;
      case 'declined':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle size={12} /> Declined</Badge>;
      case 'completed':
        return <Badge className="bg-wellness-gold flex items-center gap-1"><CheckCircle size={12} /> Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="flex items-center gap-1"><XCircle size={12} /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
          <p className="text-muted-foreground">
            Browse our specialists and book your first session!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <Card key={booking.id} className="shadow-soft hover:shadow-wellness transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{booking.specialist?.full_name}</h3>
                  {getStatusBadge(booking.status)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {booking.specialist?.specialty}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} className="text-muted-foreground" />
                    {booking.slot && format(new Date(booking.slot.start_time), 'EEEE, MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} className="text-muted-foreground" />
                    {booking.slot && format(new Date(booking.slot.start_time), 'h:mm a')} - {booking.slot && format(new Date(booking.slot.end_time), 'h:mm a')}
                  </span>
                </div>
                {booking.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    "{booking.notes}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {booking.status === 'approved' && booking.zoom_link && (
                  <Button variant="wellness" size="sm" asChild>
                    <a href={booking.zoom_link} target="_blank" rel="noopener noreferrer">
                      <Video size={16} />
                      Join Meeting
                    </a>
                  </Button>
                )}
                {booking.status === 'pending' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => cancelBooking(booking.id, booking.slot_id)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BookingsList;

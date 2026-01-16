import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Video, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import BookingConversation from './BookingConversation';

interface Booking {
  id: string;
  status: string;
  meeting_link: string | null;
  notes: string | null;
  proposed_datetime: string | null;
  confirmed_datetime: string | null;
  created_at: string;
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
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, status, meeting_link, notes, proposed_datetime, confirmed_datetime, created_at,
        specialist:specialists(full_name, specialty, hourly_rate)
      `)
      .eq('employee_user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBookings(data as unknown as Booking[]);
    }
    setLoading(false);
  };

  const cancelBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (error) {
      toast({ title: "Cancellation failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Booking cancelled" });
    fetchBookings();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="flex items-center gap-1"><Clock size={12} /> Pending</Badge>;
      case 'approved': return <Badge className="bg-primary flex items-center gap-1"><CheckCircle size={12} /> Confirmed</Badge>;
      case 'declined': return <Badge variant="destructive" className="flex items-center gap-1"><XCircle size={12} /> Declined</Badge>;
      case 'cancelled': return <Badge variant="outline" className="flex items-center gap-1"><XCircle size={12} /> Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>)}</div>;
  }

  if (bookings.length === 0) {
    return <Card className="text-center py-12"><CardContent><Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3><p className="text-muted-foreground">Browse our specialists and book your first session!</p></CardContent></Card>;
  }

  return (
    <>
      <div className="space-y-4">
        {bookings.map((booking) => {
          const displayDate = booking.confirmed_datetime || booking.proposed_datetime;
          return (
            <Card key={booking.id} className="shadow-soft hover:shadow-wellness transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{booking.specialist?.full_name}</h3>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{booking.specialist?.specialty}</p>
                    {displayDate && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1"><Calendar size={14} className="text-muted-foreground" />{format(new Date(displayDate), 'EEEE, MMM d, yyyy')}</span>
                        <span className="flex items-center gap-1"><Clock size={14} className="text-muted-foreground" />{format(new Date(displayDate), 'h:mm a')}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => setSelectedBooking(booking)}><MessageCircle size={16} className="mr-1" />Messages</Button>
                    {booking.status === 'approved' && booking.meeting_link && <Button variant="wellness" size="sm" asChild><a href={booking.meeting_link} target="_blank" rel="noopener noreferrer"><Video size={16} className="mr-1" />Join Meeting</a></Button>}
                    {booking.status === 'pending' && <Button variant="outline" size="sm" onClick={() => cancelBooking(booking.id)}>Cancel</Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Conversation with {selectedBooking?.specialist?.full_name}</DialogTitle></DialogHeader>
          {selectedBooking && <BookingConversation bookingId={selectedBooking.id} userType="employee" maxMessages={10} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookingsList;

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, CheckCircle, XCircle, MessageCircle, User } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BookingConversation from './BookingConversation';

interface Booking {
  id: string;
  status: string;
  notes: string | null;
  proposed_datetime: string | null;
  confirmed_datetime: string | null;
  meeting_link: string | null;
  created_at: string;
  employee: {
    email: string;
    full_name: string | null;
  } | null;
}

interface SpecialistBookingRequestsProps {
  specialistId: string;
  onBookingUpdate?: () => void;
}

const SpecialistBookingRequests: React.FC<SpecialistBookingRequestsProps> = ({
  specialistId,
  onBookingUpdate,
}) => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [specialistId]);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        notes,
        proposed_datetime,
        confirmed_datetime,
        meeting_link,
        created_at,
        employee:profiles!bookings_employee_user_id_fkey(email, full_name)
      `)
      .eq('specialist_id', specialistId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBookings(data as unknown as Booking[]);
    }
    setLoading(false);
  };

  const generateMeetingLink = () => {
    const roomId = `hollyaid-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return `https://meet.jit.si/${roomId}`;
  };

  const handleAccept = async (booking: Booking) => {
    setProcessing(booking.id);
    
    const meetingLink = generateMeetingLink();
    
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'approved',
        confirmed_datetime: booking.proposed_datetime,
        meeting_link: meetingLink,
      })
      .eq('id', booking.id);

    if (error) {
      toast({
        title: "Failed to accept booking",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Send confirmation email
      try {
        await supabase.functions.invoke('send-booking-confirmation', {
          body: { bookingId: booking.id },
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }
      
      toast({
        title: "Booking accepted",
        description: "The employee will receive a confirmation with the meeting link.",
      });
      fetchBookings();
      onBookingUpdate?.();
    }
    
    setProcessing(null);
  };

  const handleDecline = async (bookingId: string) => {
    setProcessing(bookingId);
    
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'declined' })
      .eq('id', bookingId);

    if (error) {
      toast({
        title: "Failed to decline booking",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Booking declined",
      });
      fetchBookings();
      onBookingUpdate?.();
    }
    
    setProcessing(null);
  };

  const handleMarkCompleted = async (bookingId: string) => {
    setProcessing(bookingId);
    
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId);

    if (error) {
      toast({
        title: "Failed to mark as completed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Session marked as completed",
        description: "This booking has been moved to your history.",
      });
      fetchBookings();
      onBookingUpdate?.();
    }
    
    setProcessing(null);
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
          <h3 className="text-lg font-semibold mb-2">No Booking Requests</h3>
          <p className="text-muted-foreground">
            You don't have any booking requests yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {bookings.map((booking) => (
          <Card key={booking.id} className="shadow-soft hover:shadow-wellness transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User size={18} className="text-muted-foreground" />
                    <h3 className="font-semibold text-lg">
                      {booking.employee?.full_name || booking.employee?.email || 'Unknown Employee'}
                    </h3>
                    {getStatusBadge(booking.status)}
                  </div>
                  
                  {booking.proposed_datetime && (
                    <div className="flex items-center gap-4 text-sm mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} className="text-muted-foreground" />
                        {format(new Date(booking.proposed_datetime), 'EEEE, MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-muted-foreground" />
                        {format(new Date(booking.proposed_datetime), 'h:mm a')}
                      </span>
                    </div>
                  )}
                  
                  {booking.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      "{booking.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <MessageCircle size={16} className="mr-1" />
                    Messages
                  </Button>
                  
                  {booking.status === 'pending' && (
                    <>
                      <Button
                        variant="wellness"
                        size="sm"
                        onClick={() => handleAccept(booking)}
                        disabled={processing === booking.id}
                      >
                        <CheckCircle size={16} className="mr-1" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDecline(booking.id)}
                        disabled={processing === booking.id}
                      >
                        <XCircle size={16} className="mr-1" />
                        Decline
                      </Button>
                    </>
                  )}
                  
                  {booking.status === 'approved' && (
                    <>
                      {booking.meeting_link && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={booking.meeting_link} target="_blank" rel="noopener noreferrer">
                            Join Meeting
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="wellness"
                        size="sm"
                        onClick={() => handleMarkCompleted(booking.id)}
                        disabled={processing === booking.id}
                      >
                        <CheckCircle size={16} className="mr-1" />
                        Mark Completed
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversation Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Conversation with {selectedBooking?.employee?.full_name || selectedBooking?.employee?.email}
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <BookingConversation
              bookingId={selectedBooking.id}
              userType="specialist"
              maxMessages={10}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SpecialistBookingRequests;

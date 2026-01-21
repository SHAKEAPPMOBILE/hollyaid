import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, CheckCircle, XCircle, MessageCircle, User, UserPlus, Users, Video } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BookingConversation from './BookingConversation';
import CompleteSessionModal from './CompleteSessionModal';
import VideoCallModal from './VideoCallModal';

interface Booking {
  id: string;
  status: string;
  notes: string | null;
  proposed_datetime: string | null;
  confirmed_datetime: string | null;
  meeting_link: string | null;
  session_duration: number;
  session_type: string;
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
  const [bookingToComplete, setBookingToComplete] = useState<Booking | null>(null);
  const [videoCallBooking, setVideoCallBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [specialistId]);

  const fetchBookings = async () => {
    // Fetch bookings first
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        notes,
        proposed_datetime,
        confirmed_datetime,
        meeting_link,
        session_duration,
        session_type,
        created_at,
        employee_user_id
      `)
      .eq('specialist_id', specialistId)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      setLoading(false);
      return;
    }

    if (!bookingsData || bookingsData.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    // Fetch employee profiles
    const employeeIds = bookingsData.map(b => b.employee_user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, email, full_name')
      .in('user_id', employeeIds);

    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

    // Merge bookings with employee data
    const enrichedBookings = bookingsData.map(booking => ({
      ...booking,
      employee: profilesMap.get(booking.employee_user_id) || null,
    }));

    setBookings(enrichedBookings as unknown as Booking[]);
    setLoading(false);
  };

  const generateMeetingLink = () => {
    const roomId = `hollyaid-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    // Configure Jitsi to hide branding, minimize UI clutter, and enable parent communication
    const config = new URLSearchParams({
      'config.prejoinPageEnabled': 'false',
      'config.disableDeepLinking': 'true',
      'config.hideConferenceSubject': 'true',
      'config.hideConferenceTimer': 'false',
      'config.hiddenPremeetingButtons': '["invite","select-background"]',
      'config.enableClosePage': 'false',
      'interfaceConfig.SHOW_JITSI_WATERMARK': 'false',
      'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS': 'false',
      'interfaceConfig.SHOW_BRAND_WATERMARK': 'false',
      'interfaceConfig.SHOW_POWERED_BY': 'false',
      'interfaceConfig.SHOW_PROMOTIONAL_CLOSE_PAGE': 'false',
      'interfaceConfig.HIDE_INVITE_MORE_HEADER': 'true',
      'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS': 'true',
    });
    // Use 8x8.vc which has better iframe/postMessage support than meet.jit.si
    return `https://8x8.vc/hollyaid/${roomId}#${config.toString()}`;
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
      
      // Notify employee about the decline
      supabase.functions.invoke('notify-booking-decline', {
        body: { bookingId }
      }).catch(err => console.error('Failed to send decline notification:', err));
      
      fetchBookings();
      onBookingUpdate?.();
    }
    
    setProcessing(null);
  };

  const handleSessionCompleted = () => {
    fetchBookings();
    onBookingUpdate?.();
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
          <Card 
            key={booking.id} 
            className="shadow-soft hover:shadow-wellness transition-all cursor-pointer hover:border-primary/50"
            onClick={() => setSelectedBooking(booking)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User size={18} className="text-muted-foreground" />
                    <h3 className="font-semibold text-lg">
                      {booking.employee?.full_name || booking.employee?.email || 'Unknown Employee'}
                    </h3>
                    {getStatusBadge(booking.status)}
                    <Badge variant="outline" className={`text-xs ${booking.session_type === 'first_session' ? 'border-blue-300 text-blue-600' : 'border-green-300 text-green-600'}`}>
                      {booking.session_type === 'first_session' ? <><UserPlus size={10} className="mr-1" />First</> : <><Users size={10} className="mr-1" />Follow-up</>}
                    </Badge>
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
                      <Badge variant="outline" className="text-xs">
                        {booking.session_duration === 30 ? '30 min' : '1 hour'}
                      </Badge>
                    </div>
                  )}
                  
                  {booking.notes && (
                    <p className="text-sm text-muted-foreground italic line-clamp-1">
                      "{booking.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircle size={16} />
                  <span>Click to view details</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Booking Detail Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <User size={20} />
              {selectedBooking?.employee?.full_name || selectedBooking?.employee?.email}
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6">
              {/* Status & Date Info */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedBooking.status)}
                {selectedBooking.proposed_datetime && (
                  <div className="text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Calendar size={14} />
                      {format(new Date(selectedBooking.proposed_datetime), 'EEEE, MMM d, yyyy')}
                      <Clock size={14} className="ml-2" />
                      {format(new Date(selectedBooking.proposed_datetime), 'h:mm a')}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-1">Employee's Note:</p>
                    <p className="text-sm text-muted-foreground italic">"{selectedBooking.notes}"</p>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {selectedBooking.status === 'pending' && (
                  <>
                    <Button
                      variant="wellness"
                      onClick={() => {
                        handleAccept(selectedBooking);
                        setSelectedBooking(null);
                      }}
                      disabled={processing === selectedBooking.id}
                      className="flex-1"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Accept Booking
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleDecline(selectedBooking.id);
                        setSelectedBooking(null);
                      }}
                      disabled={processing === selectedBooking.id}
                      className="flex-1"
                    >
                      <XCircle size={16} className="mr-2" />
                      Decline
                    </Button>
                  </>
                )}
                
                {selectedBooking.status === 'approved' && (
                  <>
                    {selectedBooking.meeting_link && (
                      <Button 
                        variant="outline" 
                        className="flex-1 gap-2"
                        onClick={() => {
                          setVideoCallBooking(selectedBooking);
                          setSelectedBooking(null);
                        }}
                      >
                        <Video size={16} />
                        Join Meeting
                      </Button>
                    )}
                    <Button
                      variant="wellness"
                      onClick={() => {
                        setBookingToComplete(selectedBooking);
                        setSelectedBooking(null);
                      }}
                      className="flex-1"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Complete Session
                    </Button>
                  </>
                )}
              </div>

              {/* Conversation */}
              <div className="border-t pt-4">
                <BookingConversation
                  bookingId={selectedBooking.id}
                  userType="specialist"
                  maxMessages={10}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Session Modal */}
      {bookingToComplete && (
        <CompleteSessionModal
          bookingId={bookingToComplete.id}
          employeeName={bookingToComplete.employee?.full_name || bookingToComplete.employee?.email || 'Employee'}
          sessionDuration={bookingToComplete.session_duration || 60}
          open={!!bookingToComplete}
          onClose={() => setBookingToComplete(null)}
          onCompleted={handleSessionCompleted}
        />
      )}

      {/* Video Call Modal */}
      {videoCallBooking && videoCallBooking.meeting_link && (
        <VideoCallModal
          meetingLink={videoCallBooking.meeting_link}
          open={!!videoCallBooking}
          onClose={() => setVideoCallBooking(null)}
          userType="specialist"
          participantName={videoCallBooking.employee?.full_name || videoCallBooking.employee?.email || 'Employee'}
          onCompleteSession={() => {
            setBookingToComplete(videoCallBooking);
          }}
        />
      )}
    </>
  );
};

export default SpecialistBookingRequests;

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, CheckCircle, XCircle, MessageCircle, User, UserPlus, Users, Video, CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BookingConversation from './BookingConversation';
import CompleteSessionModal from './CompleteSessionModal';
import VideoCallModal from './VideoCallModal';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

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
  company_name: string | null;
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
  const [calendarBooking, setCalendarBooking] = useState<Booking | null>(null);

  // Track unread messages
  const bookingIds = useMemo(() => bookings.map(b => b.id), [bookings]);
  const { unreadCounts, markAsRead } = useUnreadMessages(bookingIds);

  // Mark as read when opening booking detail
  const handleOpenBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    markAsRead(booking.id);
  };

  useEffect(() => {
    fetchBookings();
  }, [specialistId]);

  const fetchBookings = async () => {
    // Fetch only pending and approved bookings (active requests)
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
      .in('status', ['pending', 'approved'])
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

    // Fetch company info for employees
    const { data: employeeCompanies } = await supabase
      .from('company_employees')
      .select('user_id, company_id, companies(name)')
      .in('user_id', employeeIds)
      .eq('status', 'accepted');

    const companyMap = new Map(
      employeeCompanies?.map(ec => [ec.user_id, (ec.companies as any)?.name]) || []
    );

    // Merge bookings with employee data and company name
    const enrichedBookings = bookingsData.map(booking => ({
      ...booking,
      employee: profilesMap.get(booking.employee_user_id) || null,
      company_name: companyMap.get(booking.employee_user_id) || null,
    }));

    setBookings(enrichedBookings as unknown as Booking[]);
    setLoading(false);
  };

  const generateMeetingLink = () => {
    // Generate a unique room name for JaaS - tokens will be generated when joining
    const roomId = `hollyaid-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return roomId;
  };

  // Generate ICS file content for calendar
  const generateICSContent = (booking: Booking, meetingLink: string): string => {
    const startDate = new Date(booking.proposed_datetime!);
    const endDate = new Date(startDate.getTime() + booking.session_duration * 60 * 1000);
    
    const formatICSDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeICSText = (text: string): string => {
      return text.replace(/[\\;,\n]/g, (match) => {
        if (match === '\n') return '\\n';
        return '\\' + match;
      });
    };

    const now = new Date();
    const employeeName = booking.employee?.full_name || booking.employee?.email || 'Employee';
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HollyAid//Booking System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:booking-${booking.id}@hollyaid.com
DTSTAMP:${formatICSDate(now)}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${escapeICSText(`HollyAid Session with ${employeeName}`)}
DESCRIPTION:${escapeICSText(`Wellness session with ${employeeName}\\n\\nMeeting Room: ${meetingLink}\\n\\n${booking.notes ? `Notes: ${booking.notes}` : ''}`)}
LOCATION:${escapeICSText('Online - HollyAid')}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder: Session with ${escapeICSText(employeeName)}
END:VALARM
END:VEVENT
END:VCALENDAR`;
  };

  // Generate Google Calendar URL
  const generateGoogleCalendarUrl = (booking: Booking, meetingLink: string): string => {
    const startDate = new Date(booking.proposed_datetime!);
    const endDate = new Date(startDate.getTime() + booking.session_duration * 60 * 1000);
    const employeeName = booking.employee?.full_name || booking.employee?.email || 'Employee';
    
    const formatGoogleDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `HollyAid Session with ${employeeName}`,
      dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
      details: `Wellness session with ${employeeName}\n\nMeeting Room: ${meetingLink}${booking.notes ? `\n\nNotes: ${booking.notes}` : ''}`,
      location: 'Online - HollyAid',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Download ICS file
  const downloadICSFile = (booking: Booking, meetingLink: string) => {
    const icsContent = generateICSContent(booking, meetingLink);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hollyaid-session-${format(new Date(booking.proposed_datetime!), 'yyyy-MM-dd')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Calendar file downloaded",
      description: "Open the file to add to your calendar app.",
    });
    setCalendarBooking(null);
  };

  // Open Google Calendar
  const openGoogleCalendar = (booking: Booking, meetingLink: string) => {
    const url = generateGoogleCalendarUrl(booking, meetingLink);
    window.open(url, '_blank');
    setCalendarBooking(null);
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
      
      // Update booking with meeting link for calendar dialog
      const updatedBooking = { ...booking, meeting_link: meetingLink };
      setCalendarBooking(updatedBooking);
      
      toast({
        title: "Booking accepted",
        description: "The employee will receive a confirmation with calendar invite.",
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
        return <Badge className="bg-orange-500 text-white flex items-center gap-1"><Clock size={12} /> Pending</Badge>;
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
            onClick={() => handleOpenBooking(booking)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User size={18} className="text-muted-foreground" />
                    <h3 className="font-semibold text-lg">
                      {booking.employee?.full_name || booking.employee?.email || 'Unknown Employee'}
                      {booking.company_name && (
                        <span className="text-muted-foreground font-normal text-base"> from {booking.company_name}</span>
                      )}
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
                  <div className="relative">
                    <MessageCircle size={16} />
                    {(unreadCounts[booking.id] || 0) > 0 && (
                      <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCounts[booking.id]}
                      </span>
                    )}
                  </div>
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
              {selectedBooking?.company_name && (
                <span className="text-muted-foreground font-normal text-base"> from {selectedBooking.company_name}</span>
              )}
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

      {/* Add to Calendar Dialog */}
      <Dialog open={!!calendarBooking} onOpenChange={(open) => !open && setCalendarBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="text-primary" size={24} />
              Add to Your Calendar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              The employee has received a calendar invite. Would you like to add this session to your calendar as well?
            </p>
            
            {calendarBooking && (
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="font-medium">
                  Session with {calendarBooking.employee?.full_name || calendarBooking.employee?.email || 'Employee'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {calendarBooking.proposed_datetime && format(new Date(calendarBooking.proposed_datetime), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {calendarBooking.proposed_datetime && format(new Date(calendarBooking.proposed_datetime), 'h:mm a')} ({calendarBooking.session_duration} min)
                </p>
              </div>
            )}

            <div className="grid gap-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={() => calendarBooking && openGoogleCalendar(calendarBooking, calendarBooking.meeting_link || '')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Add to Google Calendar
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={() => calendarBooking && downloadICSFile(calendarBooking, calendarBooking.meeting_link || '')}
              >
                <Calendar className="w-5 h-5 text-muted-foreground" />
                Download .ics file (Apple, Outlook, etc.)
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setCalendarBooking(null)}
            >
              Skip for now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SpecialistBookingRequests;

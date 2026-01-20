import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, XCircle, History } from 'lucide-react';
import { format } from 'date-fns';

interface Booking {
  id: string;
  status: string;
  notes: string | null;
  proposed_datetime: string | null;
  confirmed_datetime: string | null;
  created_at: string;
  employee: {
    email: string;
    full_name: string | null;
  } | null;
}

interface SpecialistBookingHistoryProps {
  specialistId: string;
}

const SpecialistBookingHistory: React.FC<SpecialistBookingHistoryProps> = ({
  specialistId,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingHistory();
  }, [specialistId]);

  const fetchBookingHistory = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        notes,
        proposed_datetime,
        confirmed_datetime,
        created_at,
        employee:profiles!bookings_employee_user_id_fkey(email, full_name)
      `)
      .eq('specialist_id', specialistId)
      .in('status', ['completed', 'cancelled', 'declined'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBookings(data as unknown as Booking[]);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-wellness-gold flex items-center gap-1"><CheckCircle size={12} /> Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="flex items-center gap-1"><XCircle size={12} /> Cancelled</Badge>;
      case 'declined':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle size={12} /> Declined</Badge>;
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
              <div className="h-16 bg-muted rounded" />
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
          <History className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Booking History</h3>
          <p className="text-muted-foreground">
            Completed and cancelled sessions will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <Card key={booking.id} className="shadow-soft">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">
                    {booking.employee?.full_name || booking.employee?.email || 'Unknown Employee'}
                  </h3>
                  {getStatusBadge(booking.status)}
                </div>
                
                {(booking.confirmed_datetime || booking.proposed_datetime) && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {format(new Date(booking.confirmed_datetime || booking.proposed_datetime!), 'EEEE, MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {format(new Date(booking.confirmed_datetime || booking.proposed_datetime!), 'h:mm a')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SpecialistBookingHistory;

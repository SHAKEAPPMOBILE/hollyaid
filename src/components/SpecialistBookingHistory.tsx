import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, XCircle, History, UserPlus, Users } from 'lucide-react';
import { format } from 'date-fns';

interface Booking {
  id: string;
  status: string;
  notes: string | null;
  proposed_datetime: string | null;
  confirmed_datetime: string | null;
  created_at: string;
  session_duration: number;
  session_type: string;
  employee: {
    email: string;
    full_name: string | null;
  } | null;
  company_name: string | null;
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
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        notes,
        proposed_datetime,
        confirmed_datetime,
        created_at,
        session_duration,
        session_type,
        employee_user_id
      `)
      .eq('specialist_id', specialistId)
      .in('status', ['completed', 'cancelled', 'declined'])
      .order('created_at', { ascending: false });

    if (bookingsError || !bookingsData || bookingsData.length === 0) {
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
                    {booking.company_name && (
                      <span className="text-muted-foreground font-normal text-base"> from {booking.company_name}</span>
                    )}
                  </h3>
                  {getStatusBadge(booking.status)}
                  <Badge variant="outline" className={`text-xs ${booking.session_type === 'first_session' ? 'border-blue-300 text-blue-600' : 'border-green-300 text-green-600'}`}>
                    {booking.session_type === 'first_session' ? <><UserPlus size={10} className="mr-1" />First</> : <><Users size={10} className="mr-1" />Follow-up</>}
                  </Badge>
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
                    <Badge variant="outline" className="text-xs">
                      {booking.session_duration === 30 ? '30 min' : '1 hour'}
                    </Badge>
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

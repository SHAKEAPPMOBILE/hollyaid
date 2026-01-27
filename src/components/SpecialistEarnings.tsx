import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Send, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SPECIALIST_TIERS } from '@/lib/plans';
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';

interface SpecialistEarningsProps {
  specialistId: string;
  rateTier: string | null;
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  period_start: string;
  period_end: string;
}

const SpecialistEarnings: React.FC<SpecialistEarningsProps> = ({ specialistId, rateTier }) => {
  const { toast } = useToast();
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [weeklySessionCount, setWeeklySessionCount] = useState(0);
  const [monthlySessionCount, setMonthlySessionCount] = useState(0);
  const [pendingPayout, setPendingPayout] = useState<PayoutRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const tier = rateTier && rateTier in SPECIALIST_TIERS 
    ? SPECIALIST_TIERS[rateTier as keyof typeof SPECIALIST_TIERS] 
    : SPECIALIST_TIERS.standard;

  useEffect(() => {
    fetchEarnings();
    fetchPendingPayout();
  }, [specialistId, rateTier]);

  const fetchEarnings = async () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Fetch completed bookings for this week
    const { data: weeklyBookings, error: weeklyError } = await supabase
      .from('bookings')
      .select('session_duration, confirmed_datetime')
      .eq('specialist_id', specialistId)
      .eq('status', 'completed')
      .gte('confirmed_datetime', weekStart.toISOString())
      .lte('confirmed_datetime', weekEnd.toISOString());

    if (!weeklyError && weeklyBookings) {
      const totalMinutes = weeklyBookings.reduce((sum, b) => sum + (b.session_duration || 60), 0);
      const hours = totalMinutes / 60;
      setWeeklyEarnings(hours * tier.specialistGets);
      setWeeklySessionCount(weeklyBookings.length);
    }

    // Fetch completed bookings for this month
    const { data: monthlyBookings, error: monthlyError } = await supabase
      .from('bookings')
      .select('session_duration, confirmed_datetime')
      .eq('specialist_id', specialistId)
      .eq('status', 'completed')
      .gte('confirmed_datetime', monthStart.toISOString())
      .lte('confirmed_datetime', monthEnd.toISOString());

    if (!monthlyError && monthlyBookings) {
      const totalMinutes = monthlyBookings.reduce((sum, b) => sum + (b.session_duration || 60), 0);
      const hours = totalMinutes / 60;
      setMonthlyEarnings(hours * tier.specialistGets);
      setMonthlySessionCount(monthlyBookings.length);
    }

    setLoading(false);
  };

  const fetchPendingPayout = async () => {
    const { data, error } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('specialist_id', specialistId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setPendingPayout(data as PayoutRequest);
    }
  };

  const handleRequestPayout = async () => {
    if (monthlyEarnings <= 0) {
      toast({
        title: "No earnings to request",
        description: "You need completed sessions before requesting a payout.",
        variant: "destructive",
      });
      return;
    }

    setRequesting(true);

    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Create payout request in database
      const { data: payoutData, error: payoutError } = await supabase
        .from('payout_requests')
        .insert({
          specialist_id: specialistId,
          amount: monthlyEarnings,
          period_start: monthStart.toISOString(),
          period_end: monthEnd.toISOString(),
          status: 'pending',
        })
        .select()
        .single();

      if (payoutError) throw payoutError;

      // Call edge function to send notification email
      const { error: notifyError } = await supabase.functions.invoke('request-payout', {
        body: {
          payoutRequestId: payoutData.id,
          specialistId,
          amount: monthlyEarnings,
          periodStart: monthStart.toISOString(),
          periodEnd: monthEnd.toISOString(),
        },
      });

      if (notifyError) {
        console.error('Error sending payout notification:', notifyError);
      }

      setPendingPayout(payoutData as PayoutRequest);

      toast({
        title: "Payout requested!",
        description: `Your request for $${monthlyEarnings.toFixed(2)} has been submitted.`,
      });
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast({
        title: "Error",
        description: "Failed to submit payout request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-6 bg-muted rounded w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Earnings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp size={16} />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">${weeklyEarnings.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">
                ({weeklySessionCount} session{weeklySessionCount !== 1 ? 's' : ''})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign size={16} />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">${monthlyEarnings.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">
                ({monthlySessionCount} session{monthlySessionCount !== 1 ? 's' : ''})
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Request Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send size={18} />
            Request Payout
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingPayout ? (
            <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3">
                <Clock className="text-amber-600" size={20} />
                <div>
                  <p className="font-medium">Pending Payout Request</p>
                  <p className="text-sm text-muted-foreground">
                    ${pendingPayout.amount.toFixed(2)} • Requested {format(new Date(pendingPayout.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                Processing
              </Badge>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Request a payout for your monthly earnings
                </p>
                <p className="text-lg font-semibold mt-1">
                  Available: ${monthlyEarnings.toFixed(2)}
                </p>
              </div>
              <Button
                onClick={handleRequestPayout}
                disabled={requesting || monthlyEarnings <= 0}
                className="flex items-center gap-2"
              >
                {requesting ? (
                  <>
                    <Clock className="animate-spin" size={16} />
                    Requesting...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Request Payout
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate Info */}
      <p className="text-xs text-muted-foreground text-center">
        Your rate: ${tier.specialistGets}/hour ({tier.name} tier)
      </p>
    </div>
  );
};

export default SpecialistEarnings;

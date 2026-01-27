import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, Check, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PayoutRequest {
  id: string;
  specialist_id: string;
  amount: number;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  notes: string | null;
  specialist?: {
    full_name: string;
    email: string;
    rate_tier: string | null;
  };
}

const AdminPayoutRequests: React.FC = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayoutRequests();
  }, []);

  const fetchPayoutRequests = async () => {
    // First get payout requests
    const { data: requestsData, error: requestsError } = await supabase
      .from('payout_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (requestsError) {
      console.error('Error fetching payout requests:', requestsError);
      setLoading(false);
      return;
    }

    if (!requestsData || requestsData.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Get unique specialist IDs
    const specialistIds = [...new Set(requestsData.map(r => r.specialist_id))];

    // Fetch specialist details
    const { data: specialists, error: specialistsError } = await supabase
      .from('specialists')
      .select('id, full_name, email, rate_tier')
      .in('id', specialistIds);

    if (specialistsError) {
      console.error('Error fetching specialists:', specialistsError);
    }

    // Create a map for quick lookup
    const specialistMap = new Map(
      (specialists || []).map(s => [s.id, s])
    );

    // Merge data
    const enrichedRequests = requestsData.map(request => ({
      ...request,
      specialist: specialistMap.get(request.specialist_id) || undefined,
    }));

    setRequests(enrichedRequests as PayoutRequest[]);
    setLoading(false);
  };

  const handleMarkAsPaid = async (requestId: string) => {
    setProcessingId(requestId);

    try {
      const { error } = await supabase
        .from('payout_requests')
        .update({
          status: 'paid',
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setRequests(prev =>
        prev.map(r =>
          r.id === requestId
            ? { ...r, status: 'paid', processed_at: new Date().toISOString() }
            : r
        )
      );

      toast({
        title: "Marked as paid",
        description: "The payout request has been marked as completed.",
      });
    } catch (error) {
      console.error('Error updating payout request:', error);
      toast({
        title: "Error",
        description: "Failed to update payout status.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign size={20} />
            Payout Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign size={20} />
          Payout Requests
          {pendingCount > 0 && (
            <Badge className="ml-2 bg-amber-500">{pendingCount} pending</Badge>
          )}
        </CardTitle>
        <CardDescription>Manage specialist payout requests</CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No payout requests yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`p-4 rounded-lg border ${
                    request.status === 'pending'
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User size={14} className="text-muted-foreground" />
                        <span className="font-medium truncate">
                          {request.specialist?.full_name || 'Unknown Specialist'}
                        </span>
                        <Badge
                          variant={request.status === 'pending' ? 'secondary' : 'outline'}
                          className={
                            request.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }
                        >
                          {request.status === 'pending' ? (
                            <><Clock size={12} className="mr-1" /> Pending</>
                          ) : (
                            <><Check size={12} className="mr-1" /> Paid</>
                          )}
                        </Badge>
                      </div>
                      
                      <div className="text-2xl font-bold text-primary mb-1">
                        ${request.amount.toFixed(2)}
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Email: {request.specialist?.email || 'N/A'}</p>
                        <p>Tier: {request.specialist?.rate_tier || 'Standard'}</p>
                        <p>
                          Period: {format(new Date(request.period_start), 'MMM d')} -{' '}
                          {format(new Date(request.period_end), 'MMM d, yyyy')}
                        </p>
                        <p>Requested: {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}</p>
                        {request.processed_at && (
                          <p className="text-green-600 dark:text-green-400">
                            Paid: {format(new Date(request.processed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {request.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsPaid(request.id)}
                        disabled={processingId === request.id}
                        className="flex items-center gap-1"
                      >
                        {processingId === request.id ? (
                          <Clock className="animate-spin" size={14} />
                        ) : (
                          <Check size={14} />
                        )}
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPayoutRequests;

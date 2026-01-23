import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Activity, UserPlus, Power, Trash2, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityLog {
  id: string;
  admin_email: string;
  action_type: string;
  target_type: string;
  target_name: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

const AdminActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('admin_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(data as ActivityLog[]);
    }
    setLoading(false);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'invite':
        return <UserPlus size={14} className="text-blue-500" />;
      case 'activate':
        return <Power size={14} className="text-green-500" />;
      case 'deactivate':
        return <Power size={14} className="text-orange-500" />;
      case 'delete':
        return <Trash2 size={14} className="text-red-500" />;
      case 'add':
        return <UserCheck size={14} className="text-primary" />;
      default:
        return <Activity size={14} className="text-muted-foreground" />;
    }
  };

  const getActionBadge = (actionType: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      invite: 'default',
      activate: 'default',
      deactivate: 'secondary',
      delete: 'destructive',
      add: 'default',
    };
    return (
      <Badge variant={variants[actionType] || 'outline'} className="text-xs">
        {actionType}
      </Badge>
    );
  };

  const getActionDescription = (log: ActivityLog) => {
    const targetName = log.target_name || 'Unknown';
    switch (log.action_type) {
      case 'invite':
        return `Sent invitation to ${targetName}`;
      case 'activate':
        return `Activated ${targetName}`;
      case 'deactivate':
        return `Deactivated ${targetName}`;
      case 'delete':
        return `Deleted ${targetName}`;
      case 'add':
        return `Added new specialist: ${targetName}`;
      default:
        return `${log.action_type} on ${targetName}`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={20} />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded" />
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
          <Activity size={20} />
          Activity Log
        </CardTitle>
        <CardDescription>Recent admin actions on the platform</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No activity recorded yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="mt-0.5">{getActionIcon(log.action_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getActionBadge(log.action_type)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">
                      {getActionDescription(log)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      by {log.admin_email}
                    </p>
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

export default AdminActivityLog;

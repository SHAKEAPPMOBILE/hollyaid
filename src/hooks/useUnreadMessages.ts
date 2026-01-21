import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadCounts {
  [bookingId: string]: number;
}

export const useUnreadMessages = (bookingIds: string[]) => {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [loading, setLoading] = useState(true);

  const fetchUnreadCounts = useCallback(async () => {
    if (!user || bookingIds.length === 0) {
      setUnreadCounts({});
      setLoading(false);
      return;
    }

    try {
      // Fetch last read timestamps for all bookings
      const { data: readData } = await supabase
        .from('booking_message_reads')
        .select('booking_id, last_read_at')
        .eq('user_id', user.id)
        .in('booking_id', bookingIds);

      const readMap = new Map(readData?.map(r => [r.booking_id, new Date(r.last_read_at)]) || []);

      // Fetch all messages for these bookings
      const { data: messages } = await supabase
        .from('booking_messages')
        .select('booking_id, created_at, sender_user_id')
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false });

      // Count unread messages per booking
      const counts: UnreadCounts = {};
      
      bookingIds.forEach(bookingId => {
        const lastRead = readMap.get(bookingId);
        const bookingMessages = messages?.filter(m => m.booking_id === bookingId) || [];
        
        // Count messages that are newer than last_read_at and not sent by current user
        const unreadCount = bookingMessages.filter(m => {
          if (m.sender_user_id === user.id) return false; // Don't count own messages
          if (!lastRead) return true; // If never read, all messages are unread
          return new Date(m.created_at) > lastRead;
        }).length;
        
        counts[bookingId] = unreadCount;
      });

      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    } finally {
      setLoading(false);
    }
  }, [user, bookingIds.join(',')]);

  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Subscribe to new messages for real-time updates
  useEffect(() => {
    if (!user || bookingIds.length === 0) return;

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_messages',
        },
        (payload) => {
          const newMessage = payload.new as { booking_id: string; sender_user_id: string };
          // Only increment if message is in our bookingIds and not from current user
          if (bookingIds.includes(newMessage.booking_id) && newMessage.sender_user_id !== user.id) {
            setUnreadCounts(prev => ({
              ...prev,
              [newMessage.booking_id]: (prev[newMessage.booking_id] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, bookingIds.join(',')]);

  const markAsRead = useCallback(async (bookingId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('booking_message_reads')
        .upsert({
          booking_id: bookingId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'booking_id,user_id',
        });

      if (!error) {
        setUnreadCounts(prev => ({
          ...prev,
          [bookingId]: 0,
        }));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [user]);

  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return { unreadCounts, totalUnread, loading, markAsRead, refetch: fetchUnreadCounts };
};

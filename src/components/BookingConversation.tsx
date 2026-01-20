import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  sender_user_id: string;
  sender_type: 'employee' | 'specialist';
  message: string;
  created_at: string;
}

interface BookingConversationProps {
  bookingId: string;
  userType: 'employee' | 'specialist';
  maxMessages?: number;
}

const BookingConversation: React.FC<BookingConversationProps> = ({
  bookingId,
  userType,
  maxMessages = 10,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`booking-messages-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('booking_messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
    }
    setLoading(false);
  };

  const userMessageCount = messages.filter(m => m.sender_type === userType).length;
  const canSendMore = userMessageCount < maxMessages;

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !canSendMore) return;

    const messageText = newMessage.trim();
    setSending(true);
    
    const { data, error } = await supabase
      .from('booking_messages')
      .insert({
        booking_id: bookingId,
        sender_user_id: user.id,
        sender_type: userType,
        message: messageText,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      // Add message to state immediately (optimistic update)
      setMessages((prev) => {
        // Avoid duplicates if realtime already added it
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data as Message];
      });
      setNewMessage('');
      
      // Send email notification in background (don't block UI)
      supabase.functions.invoke('notify-booking-message', {
        body: {
          bookingId,
          senderType: userType,
          messagePreview: messageText,
        },
      }).catch((err) => {
        console.error('Failed to send message notification:', err);
      });
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <MessageCircle size={18} />
          Conversation
        </h4>
        <Badge variant="secondary">
          {userMessageCount}/{maxMessages} messages sent
        </Badge>
      </div>

      <ScrollArea className="h-[200px] border rounded-lg p-3">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === userType ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.sender_type === userType
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender_type === userType ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {canSendMore ? (
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={2}
            maxLength={300}
            className="resize-none"
          />
          <Button
            variant="wellness"
            size="icon"
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
          >
            <Send size={18} />
          </Button>
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <Clock size={16} className="inline mr-1" />
          You've reached the message limit ({maxMessages} messages).
        </div>
      )}
    </div>
  );
};

export default BookingConversation;

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Send } from 'lucide-react';
import { format, addDays } from 'date-fns';

// Generate time slots with 15-minute increments
const generateTimeSlots = () => {
  const slots: { value: string; label: string }[] = [];
  for (let hour = 6; hour <= 21; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      const value = `${h}:${m}`;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const label = `${displayHour}:${m} ${period}`;
      slots.push({ value, label });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

interface Specialist {
  id: string;
  full_name: string;
  specialty: string;
  hourly_rate: number;
  rate_tier?: string | null;
}

// Minutes deducted per 1-hour session based on tier
const TIER_MINUTES: Record<string, number> = {
  standard: 60,
  advanced: 96,
  expert: 144,
  master: 192,
};

const TIER_LABELS: Record<string, string> = {
  standard: 'Standard',
  advanced: 'Advanced',
  expert: 'Expert',
  master: 'Master',
};

interface BookingRequestModalProps {
  specialist: Specialist;
  onClose: () => void;
}

const BookingRequestModal: React.FC<BookingRequestModalProps> = ({ specialist, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 90), 'yyyy-MM-dd');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!proposedDate || !proposedTime) {
      toast({
        title: "Missing information",
        description: "Please select a date and time for your booking request.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const proposedDateTime = new Date(`${proposedDate}T${proposedTime}`);

    // Create booking request
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        specialist_id: specialist.id,
        employee_user_id: user.id,
        proposed_datetime: proposedDateTime.toISOString(),
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (bookingError) {
      toast({
        title: "Booking request failed",
        description: bookingError.message,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Send initial message if notes provided
    if (notes && booking) {
      await supabase
        .from('booking_messages')
        .insert({
          booking_id: booking.id,
          sender_user_id: user.id,
          sender_type: 'employee',
          message: notes,
        });
    }

    // Send email notification to specialist (don't await to avoid blocking)
    if (booking) {
      supabase.functions.invoke('notify-specialist-booking', {
        body: { bookingId: booking.id },
      }).catch((error) => {
        console.error('Failed to send notification email:', error);
      });
    }

    toast({
      title: "Booking request sent!",
      description: `Your request has been sent to ${specialist.full_name}. They will respond shortly.`,
    });

    onClose();
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date/Time Selection */}
        <div className="space-y-4">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Calendar size={18} />
            Propose a date and time
          </Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                min={today}
                max={maxDate}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Select value={proposedTime} onValueChange={setProposedTime}>
                <SelectTrigger id="time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Message to the specialist (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Tell the specialist about what you'd like to discuss, or suggest alternative times if needed..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{notes.length}/500</p>
        </div>

        {/* Minutes deduction info */}
        <Card className="bg-secondary/30">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Minutes per session</span>
              <div className="text-right">
                <span className="font-semibold text-lg">
                  {TIER_MINUTES[specialist.rate_tier || 'standard']} min
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  ({TIER_LABELS[specialist.rate_tier || 'standard']} tier)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
          <p className="font-medium mb-1">What happens next?</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>The specialist will review your request</li>
            <li>They can accept, decline, or suggest a different time</li>
            <li>You'll receive a notification with their response</li>
            <li>Once confirmed, a meeting link will be generated</li>
          </ul>
        </div>

        {/* Action */}
        <Button
          type="submit"
          variant="wellness"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? (
            'Sending Request...'
          ) : (
            <>
              <Send size={18} className="mr-2" />
              Send Booking Request
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default BookingRequestModal;

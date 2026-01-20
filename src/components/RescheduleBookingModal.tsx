import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, RefreshCw } from 'lucide-react';
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

interface Booking {
  id: string;
  confirmed_datetime: string | null;
  specialist: {
    full_name: string;
  } | null;
}

interface RescheduleBookingModalProps {
  booking: Booking;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RescheduleBookingModal: React.FC<RescheduleBookingModalProps> = ({
  booking,
  open,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 90), 'yyyy-MM-dd');

  const handleReschedule = async () => {
    if (!proposedDate || !proposedTime) {
      toast({
        title: "Missing information",
        description: "Please select a new date and time.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const newProposedDateTime = new Date(`${proposedDate}T${proposedTime}`);

    // Update booking to pending with new proposed datetime
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'pending',
        proposed_datetime: newProposedDateTime.toISOString(),
        confirmed_datetime: null,
        meeting_link: null,
      })
      .eq('id', booking.id);

    if (error) {
      toast({
        title: "Reschedule failed",
        description: error.message,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Send notification to specialist
    try {
      await supabase.functions.invoke('notify-booking-reschedule', {
        body: { bookingId: booking.id },
      });
    } catch (emailError) {
      console.error('Failed to send reschedule notification:', emailError);
      // Don't fail the reschedule if email fails
    }

    toast({
      title: "Reschedule request sent",
      description: `Your new time has been proposed to ${booking.specialist?.full_name}. They will need to confirm.`,
    });

    setProposedDate('');
    setProposedTime('');
    setSubmitting(false);
    onSuccess();
    onClose();
  };

  const currentDateTime = booking.confirmed_datetime 
    ? new Date(booking.confirmed_datetime)
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw size={20} />
            Reschedule Booking
          </DialogTitle>
          <DialogDescription>
            Propose a new date and time for your session with{' '}
            <strong>{booking.specialist?.full_name}</strong>.
            {currentDateTime && (
              <span className="block mt-2 text-muted-foreground">
                Currently scheduled: {format(currentDateTime, 'EEEE, MMM d, yyyy')} at{' '}
                {format(currentDateTime, 'h:mm a')}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar size={16} />
              New Date & Time
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reschedule-date" className="text-xs text-muted-foreground">
                  Date
                </Label>
                <Input
                  id="reschedule-date"
                  type="date"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  min={today}
                  max={maxDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reschedule-time" className="text-xs text-muted-foreground">
                  Time
                </Label>
                <Select value={proposedTime} onValueChange={setProposedTime}>
                  <SelectTrigger id="reschedule-time">
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

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">Note:</p>
            <p className="text-xs">
              Rescheduling will change your booking status to pending. The specialist will need to 
              confirm the new time before it's finalized.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="wellness" onClick={handleReschedule} disabled={submitting}>
            {submitting ? 'Sending...' : 'Request Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleBookingModal;

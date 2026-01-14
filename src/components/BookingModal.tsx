import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Specialist {
  id: string;
  full_name: string;
  specialty: string;
  hourly_rate: number;
}

interface AvailabilitySlot {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface BookingModalProps {
  specialist: Specialist;
  onClose: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ specialist, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchAvailableSlots();
  }, [specialist.id]);

  const fetchAvailableSlots = async () => {
    const { data, error } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('specialist_id', specialist.id)
      .eq('is_booked', false)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (!error && data) {
      setSlots(data);
    }
    setLoading(false);
  };

  const handleBooking = async () => {
    if (!selectedSlot || !user) return;

    setBooking(true);

    // Create booking
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({
        slot_id: selectedSlot.id,
        employee_user_id: user.id,
        specialist_id: specialist.id,
        notes: notes || null,
        status: 'pending',
      });

    if (bookingError) {
      toast({
        title: "Booking failed",
        description: bookingError.message,
        variant: "destructive",
      });
      setBooking(false);
      return;
    }

    // Mark slot as booked
    await supabase
      .from('availability_slots')
      .update({ is_booked: true })
      .eq('id', selectedSlot.id);

    toast({
      title: "Booking requested!",
      description: "The specialist will review your booking request.",
    });

    onClose();
    setBooking(false);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h4 className="font-semibold mb-2">No Available Slots</h4>
        <p className="text-sm text-muted-foreground">
          This specialist doesn't have any available time slots right now.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Slot selection */}
      <div className="space-y-3">
        <Label>Select a time slot</Label>
        <div className="grid gap-2 max-h-60 overflow-y-auto">
          {slots.map((slot) => (
            <Card
              key={slot.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedSlot?.id === slot.id 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:bg-secondary/50'
              }`}
              onClick={() => setSelectedSlot(slot)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(slot.start_time), 'EEEE, MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(slot.start_time), 'h:mm a')} - {format(new Date(slot.end_time), 'h:mm a')}
                    </p>
                  </div>
                </div>
                {selectedSlot?.id === slot.id && (
                  <CheckCircle className="text-primary" size={20} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes for the specialist (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Tell the specialist about what you'd like to discuss..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Price summary */}
      <Card className="bg-secondary/30">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Session rate</span>
            <span className="font-semibold text-lg">${specialist.hourly_rate}/hour</span>
          </div>
        </CardContent>
      </Card>

      {/* Action */}
      <Button
        variant="wellness"
        size="lg"
        className="w-full"
        disabled={!selectedSlot || booking}
        onClick={handleBooking}
      >
        {booking ? 'Booking...' : 'Request Booking'}
      </Button>
    </div>
  );
};

export default BookingModal;

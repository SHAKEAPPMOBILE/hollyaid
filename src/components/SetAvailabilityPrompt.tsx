import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Plus, X, CheckCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface SetAvailabilityPromptProps {
  specialistId: string;
  onComplete: () => void;
}

const SetAvailabilityPrompt: React.FC<SetAvailabilityPromptProps> = ({
  specialistId,
  onComplete,
}) => {
  const { toast } = useToast();
  const [slots, setSlots] = useState<TimeSlot[]>([
    { date: '', startTime: '', endTime: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 90), 'yyyy-MM-dd');

  const addSlot = () => {
    setSlots([...slots, { date: '', startTime: '', endTime: '' }]);
  };

  const removeSlot = (index: number) => {
    if (slots.length > 1) {
      setSlots(slots.filter((_, i) => i !== index));
    }
  };

  const updateSlot = (index: number, field: keyof TimeSlot, value: string) => {
    const updated = [...slots];
    updated[index][field] = value;
    setSlots(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all slots
    const validSlots = slots.filter(s => s.date && s.startTime && s.endTime);
    if (validSlots.length === 0) {
      toast({
        title: "No valid slots",
        description: "Please add at least one availability slot.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    // Validate time ranges
    for (const slot of validSlots) {
      const startDateTime = new Date(`${slot.date}T${slot.startTime}`);
      const endDateTime = new Date(`${slot.date}T${slot.endTime}`);
      
      if (endDateTime <= startDateTime) {
        toast({
          title: "Invalid time range",
          description: "End time must be after start time for all slots.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
    }

    // Insert slots
    const slotsToInsert = validSlots.map(slot => ({
      specialist_id: specialistId,
      start_time: new Date(`${slot.date}T${slot.startTime}`).toISOString(),
      end_time: new Date(`${slot.date}T${slot.endTime}`).toISOString(),
      is_booked: false,
    }));

    const { error: slotsError } = await supabase
      .from('availability_slots')
      .insert(slotsToInsert);

    if (slotsError) {
      toast({
        title: "Failed to save availability",
        description: slotsError.message,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Mark specialist as having set availability
    const { error: updateError } = await supabase
      .from('specialists')
      .update({ has_set_availability: true })
      .eq('id', specialistId);

    if (updateError) {
      console.error('Failed to update specialist:', updateError);
    }

    toast({
      title: "Availability saved!",
      description: `You've added ${validSlots.length} availability slot(s).`,
    });

    onComplete();
    setSubmitting(false);
  };

  const handleSkip = async () => {
    // Mark as set even if skipped, so prompt doesn't show again
    await supabase
      .from('specialists')
      .update({ has_set_availability: true })
      .eq('id', specialistId);
    
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
            <Calendar className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome! Set Your Availability</CardTitle>
          <CardDescription className="text-base">
            Let employees know when you're available for consultations. You can always update this later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {slots.map((slot, index) => (
                <div key={index} className="flex items-end gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={slot.date}
                        onChange={(e) => updateSlot(index, 'date', e.target.value)}
                        min={today}
                        max={maxDate}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                      />
                    </div>
                  </div>
                  {slots.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSlot(index)}
                      className="text-destructive"
                    >
                      <X size={18} />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addSlot}
            >
              <Plus size={18} className="mr-2" />
              Add Another Slot
            </Button>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={handleSkip}
              >
                Skip for now
              </Button>
              <Button
                type="submit"
                variant="wellness"
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? (
                  'Saving...'
                ) : (
                  <>
                    <CheckCircle size={18} className="mr-2" />
                    Save Availability
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetAvailabilityPrompt;

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Clock, User } from 'lucide-react';

interface CompleteSessionModalProps {
  bookingId: string;
  employeeName: string;
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

// Duration options in minutes
const DURATION_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '75', label: '1 hour 15 min' },
  { value: '90', label: '1 hour 30 min' },
  { value: '105', label: '1 hour 45 min' },
  { value: '120', label: '2 hours' },
];

const CompleteSessionModal: React.FC<CompleteSessionModalProps> = ({
  bookingId,
  employeeName,
  open,
  onClose,
  onCompleted,
}) => {
  const { toast } = useToast();
  const [duration, setDuration] = useState('60');
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async () => {
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('complete-booking', {
        body: { bookingId, sessionMinutes: parseInt(duration) },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Session completed!",
        description: `${data.minutesDeducted} wellness minutes deducted (${data.tier} tier).`,
      });
      
      onCompleted();
      onClose();
    } catch (err: any) {
      toast({
        title: "Failed to complete session",
        description: err.message,
        variant: "destructive",
      });
    }

    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <CheckCircle className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Complete Session</DialogTitle>
          <DialogDescription className="text-center">
            Mark your session with {employeeName} as complete
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Session Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <User className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{employeeName}</p>
              <p className="text-xs text-muted-foreground">Session participant</p>
            </div>
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Session Duration
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The appropriate wellness minutes will be deducted based on your tier rate.
            </p>
          </div>

          {/* Actions */}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              variant="wellness" 
              onClick={handleComplete} 
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? "Completing..." : "Complete Session"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompleteSessionModal;

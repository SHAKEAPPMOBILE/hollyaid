import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

const SESSION_DURATION_MINUTES = 60;

const CompleteSessionModal: React.FC<CompleteSessionModalProps> = ({
  bookingId,
  employeeName,
  open,
  onClose,
  onCompleted,
}) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async () => {
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('complete-booking', {
        body: { bookingId, sessionMinutes: SESSION_DURATION_MINUTES },
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

          {/* Fixed Duration Info */}
          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">1 Hour Session</p>
              <p className="text-xs text-muted-foreground">
                Standard session duration • Wellness minutes will be deducted based on your tier
              </p>
            </div>
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

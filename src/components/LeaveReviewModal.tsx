import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaveReviewModalProps {
  bookingId: string;
  specialistId: string;
  specialistName: string;
  open: boolean;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

const LeaveReviewModal: React.FC<LeaveReviewModalProps> = ({
  bookingId,
  specialistId,
  specialistName,
  open,
  onClose,
  onReviewSubmitted,
}) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        description: "Click on the stars to rate your session.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Not authenticated",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('specialist_reviews')
      .insert({
        booking_id: bookingId,
        specialist_id: specialistId,
        employee_user_id: user.id,
        rating,
        comment: comment.trim() || null,
      });

    if (error) {
      toast({
        title: "Failed to submit review",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Review submitted!",
        description: "Thank you for your feedback.",
      });
      onReviewSubmitted();
      onClose();
    }

    setSubmitting(false);
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Session</DialogTitle>
          <DialogDescription>
            How was your session with {specialistName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    size={32}
                    className={cn(
                      "transition-colors",
                      star <= displayRating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {displayRating === 0 && "Select a rating"}
              {displayRating === 1 && "Poor"}
              {displayRating === 2 && "Fair"}
              {displayRating === 3 && "Good"}
              {displayRating === 4 && "Very Good"}
              {displayRating === 5 && "Excellent"}
            </span>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>

          {/* Submit */}
          <Button
            variant="wellness"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveReviewModal;

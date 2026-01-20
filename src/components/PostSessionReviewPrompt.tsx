import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, MessageSquare, X } from 'lucide-react';

interface PostSessionReviewPromptProps {
  specialistName: string;
  open: boolean;
  onClose: () => void;
  onLeaveReview: () => void;
}

const PostSessionReviewPrompt: React.FC<PostSessionReviewPromptProps> = ({
  specialistName,
  open,
  onClose,
  onLeaveReview,
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Star className="w-8 h-8 text-primary fill-primary/20" />
          </div>
          <DialogTitle className="text-center text-xl">Session Completed!</DialogTitle>
          <DialogDescription className="text-center">
            Your session with <span className="font-medium text-foreground">{specialistName}</span> has been marked as complete.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <MessageSquare className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Your feedback helps other employees find the right specialist and helps our community thrive.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2">
          <Button 
            variant="wellness" 
            onClick={onLeaveReview}
            className="w-full gap-2"
          >
            <Star className="w-4 h-4" />
            Leave a Review
          </Button>
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="w-full text-muted-foreground"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PostSessionReviewPrompt;

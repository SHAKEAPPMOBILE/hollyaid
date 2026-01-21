import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, PhoneOff, Star, CheckCircle, Calendar, ArrowRight, Loader2 } from 'lucide-react';

interface VideoCallModalProps {
  meetingLink: string;
  open: boolean;
  onClose: () => void;
  userType: 'specialist' | 'employee';
  participantName: string;
  onLeaveReview?: () => void;
  onCompleteSession?: () => void;
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({
  meetingLink,
  open,
  onClose,
  userType,
  participantName,
  onLeaveReview,
  onCompleteSession,
}) => {
  const [callState, setCallState] = useState<'in-call' | 'ended'>('in-call');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen for Jitsi postMessage events
  const handleJitsiMessage = useCallback((event: MessageEvent) => {
    // Jitsi sends messages from jit.si or 8x8.vc domains
    const isJitsiOrigin = event.origin.includes('jit.si') || event.origin.includes('8x8.vc');
    if (!isJitsiOrigin) return;

    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      
      // Log for debugging
      console.log('Jitsi message received:', data);
      
      // Jitsi API events we care about:
      // 'video-conference-left' - participant left the conference
      // 'video-hangup' - user hung up
      // 'readyToClose' - Jitsi is ready to close
      // 'participant-left' - a participant left (might be the only one)
      const eventName = data.event || data.name || data.type || '';
      
      if (
        eventName === 'video-conference-left' ||
        eventName === 'video-hangup' ||
        eventName === 'readyToClose' ||
        eventName === 'videoConferenceLeft' ||
        eventName === 'hangup'
      ) {
        console.log('Jitsi call ended:', eventName);
        setCallState('ended');
      }
    } catch (e) {
      // Not a JSON message or parsing error, ignore
    }
  }, []);

  // Reset state when modal opens and set up event listeners
  useEffect(() => {
    if (open) {
      setCallState('in-call');
      setIframeLoaded(false);
      
      // Listen for postMessage events from Jitsi
      window.addEventListener('message', handleJitsiMessage);
      
      return () => {
        window.removeEventListener('message', handleJitsiMessage);
      };
    }
  }, [open, handleJitsiMessage]);

  const handleEndCall = () => {
    setCallState('ended');
  };

  const handleClose = () => {
    setCallState('in-call');
    setIframeLoaded(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden">
        {callState === 'in-call' ? (
          <div className="flex flex-col h-full">
            {/* Call Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-card border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Video Session with {participantName}</p>
                  <p className="text-xs text-muted-foreground">Session in progress</p>
                </div>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleEndCall}
                className="gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                End Call
              </Button>
            </div>

            {/* Video iframe */}
            <div className="flex-1 relative bg-black">
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-background">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Connecting to video session...</p>
                  </div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={meetingLink}
                className="w-full h-full border-0"
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                onLoad={() => setIframeLoaded(true)}
              />
            </div>
          </div>
        ) : (
          // Post-Call Screen
          <div className="flex flex-col items-center justify-center h-full p-8 bg-gradient-to-b from-background to-secondary/20">
            <div className="max-w-md w-full text-center space-y-6">
              {/* Success Icon */}
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>

              {/* Title */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Session Ended
                </h2>
                <p className="text-muted-foreground">
                  Your video session with {participantName} has ended.
                </p>
              </div>

              {/* User-specific content */}
              {userType === 'employee' ? (
                <div className="space-y-4">
                  <div className="bg-card rounded-xl p-6 border shadow-soft">
                    <Star className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">How was your session?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your feedback helps other employees find the right specialist and helps our community thrive.
                    </p>
                    {onLeaveReview && (
                      <Button 
                        variant="wellness" 
                        className="w-full gap-2"
                        onClick={() => {
                          handleClose();
                          onLeaveReview();
                        }}
                      >
                        <Star className="w-4 h-4" />
                        Leave a Review
                      </Button>
                    )}
                  </div>

                  <Button 
                    variant="ghost" 
                    onClick={handleClose}
                    className="text-muted-foreground"
                  >
                    Maybe Later
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-card rounded-xl p-6 border shadow-soft">
                    <Calendar className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Complete this session?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Mark the session as complete to log the wellness minutes used by the company.
                    </p>
                    {onCompleteSession && (
                      <Button 
                        variant="wellness" 
                        className="w-full gap-2"
                        onClick={() => {
                          handleClose();
                          onCompleteSession();
                        }}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete Session
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <Button 
                    variant="ghost" 
                    onClick={handleClose}
                    className="text-muted-foreground"
                  >
                    I'll do this later
                  </Button>
                </div>
              )}

              {/* Thank you message */}
              <p className="text-xs text-muted-foreground pt-4 border-t">
                Thank you for using HollyAid Wellness
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallModal;

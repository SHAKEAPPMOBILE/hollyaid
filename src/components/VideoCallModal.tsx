import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, PhoneOff, Star, CheckCircle, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VideoCallModalProps {
  meetingLink: string; // This is now the room name, not full URL
  open: boolean;
  onClose: () => void;
  userType: 'specialist' | 'employee';
  participantName: string;
  onLeaveReview?: () => void;
  onCompleteSession?: () => void;
}

const JAAS_APP_ID = 'vpaas-magic-cookie-700eb763d1c046a3be78af5445dcba9d';

const VideoCallModal: React.FC<VideoCallModalProps> = ({
  meetingLink,
  open,
  onClose,
  userType,
  participantName,
  onLeaveReview,
  onCompleteSession,
}) => {
  const { user } = useAuth();
  const [callState, setCallState] = useState<'loading' | 'in-call' | 'ended'>('loading');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
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

  // Fetch user profile when modal opens
  useEffect(() => {
    if (open && user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', user.id)
          .single();
        setUserProfile(data);
      };
      fetchProfile();
    }
  }, [open, user]);

  // Generate JaaS token when modal opens
  useEffect(() => {
    if (open && user) {
      setCallState('loading');
      setIframeLoaded(false);
      setMeetingUrl(null);
      setTokenError(null);
      
      // Extract room name from meeting_link (it might be a full URL or just a room name)
      let roomName = meetingLink;
      if (meetingLink.includes('/')) {
        // If it's a full URL, extract the room name
        const urlParts = meetingLink.split('/');
        roomName = urlParts[urlParts.length - 1].split('#')[0].split('?')[0];
      }

      const generateToken = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('generate-jaas-token', {
            body: {
              roomName,
              userName: userProfile?.full_name || user.email?.split('@')[0] || 'Guest',
              userEmail: user.email || '',
              userId: user.id,
              avatarUrl: userProfile?.avatar_url || '',
              isModerator: userType === 'specialist',
            },
          });

          if (error) throw error;
          if (!data?.meetingUrl) throw new Error('No meeting URL returned');

          setMeetingUrl(data.meetingUrl);
          setCallState('in-call');
        } catch (err) {
          console.error('Failed to generate JaaS token:', err);
          setTokenError(err instanceof Error ? err.message : 'Failed to join meeting');
          // Fallback to basic 8x8.vc link without JWT for backwards compatibility
          const fallbackUrl = `https://8x8.vc/${JAAS_APP_ID}/${roomName}`;
          setMeetingUrl(fallbackUrl);
          setCallState('in-call');
        }
      };

      generateToken();
      
      // Listen for postMessage events from Jitsi
      window.addEventListener('message', handleJitsiMessage);
      
      return () => {
        window.removeEventListener('message', handleJitsiMessage);
      };
    }
  }, [open, meetingLink, user, userProfile, userType, handleJitsiMessage]);

  const handleEndCall = () => {
    setCallState('ended');
    setMeetingUrl(null);
  };

  const handleClose = () => {
    setCallState('loading');
    setIframeLoaded(false);
    setMeetingUrl(null);
    setTokenError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden">
        {callState === 'loading' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preparing video session...</p>
            </div>
          </div>
        ) : callState === 'in-call' && meetingUrl ? (
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
                src={meetingUrl}
                className="w-full h-full border-0"
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                onLoad={() => setIframeLoaded(true)}
              />
            </div>
          </div>
        ) : callState === 'ended' ? (
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallModal;

import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  status: string;
  meeting_link: string | null;
  confirmed_datetime: string | null;
  proposed_datetime: string | null;
  specialist?: {
    full_name: string;
  } | null;
}

const REMINDER_MINUTES = 5;
const CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

export const useMeetingReminder = (bookings: Booking[]) => {
  const { toast } = useToast();
  const notifiedBookingsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Play notification sound using Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create a pleasant notification chime
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        const now = ctx.currentTime + startTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
      };

      // Play a pleasant two-tone chime
      playTone(880, 0, 0.15);    // A5
      playTone(1108, 0.15, 0.2); // C#6
      playTone(1318, 0.35, 0.3); // E6
      
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((specialistName: string, minutesUntil: number) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Meeting Starting Soon! 🔔', {
        body: `Your session with ${specialistName} starts in ${minutesUntil} minutes`,
        icon: '/favicon.ico',
        tag: 'meeting-reminder',
        requireInteraction: true,
      });

      // Auto-close after 30 seconds
      setTimeout(() => notification.close(), 30000);

      // Focus window when notification is clicked
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, []);

  // Check for upcoming meetings
  useEffect(() => {
    const checkUpcomingMeetings = () => {
      const now = new Date();
      
      bookings.forEach((booking) => {
        // Only check approved bookings with meeting links
        if (booking.status !== 'approved' || !booking.meeting_link) return;
        
        const meetingTime = booking.confirmed_datetime || booking.proposed_datetime;
        if (!meetingTime) return;

        const meetingDate = new Date(meetingTime);
        const minutesUntil = (meetingDate.getTime() - now.getTime()) / (1000 * 60);

        // Check if within reminder window (5 minutes before, but not past start)
        if (minutesUntil > 0 && minutesUntil <= REMINDER_MINUTES) {
          // Only notify once per booking
          if (!notifiedBookingsRef.current.has(booking.id)) {
            notifiedBookingsRef.current.add(booking.id);
            
            const specialistName = booking.specialist?.full_name || 'your specialist';
            const roundedMinutes = Math.ceil(minutesUntil);

            // Play sound
            playNotificationSound();

            // Show browser notification
            showBrowserNotification(specialistName, roundedMinutes);

            // Show in-app toast
            toast({
              title: "🔔 Meeting Starting Soon!",
              description: `Your session with ${specialistName} starts in ${roundedMinutes} minute${roundedMinutes !== 1 ? 's' : ''}`,
              duration: 15000,
            });
          }
        }
      });
    };

    // Check immediately
    checkUpcomingMeetings();

    // Then check periodically
    const interval = setInterval(checkUpcomingMeetings, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [bookings, toast, playNotificationSound, showBrowserNotification]);

  // Clean up notified bookings that are now in the past
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      
      bookings.forEach((booking) => {
        const meetingTime = booking.confirmed_datetime || booking.proposed_datetime;
        if (!meetingTime) return;

        const meetingDate = new Date(meetingTime);
        // If meeting started more than 1 hour ago, remove from notified set
        if (now.getTime() - meetingDate.getTime() > 60 * 60 * 1000) {
          notifiedBookingsRef.current.delete(booking.id);
        }
      });
    }, 60000); // Clean up every minute

    return () => clearInterval(cleanupInterval);
  }, [bookings]);

  return { notifiedBookings: notifiedBookingsRef.current };
};

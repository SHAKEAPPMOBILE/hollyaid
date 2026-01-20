import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, X, Star } from 'lucide-react';
import SpecialistReviews from './SpecialistReviews';

interface Specialist {
  id: string;
  full_name: string;
  specialty: string;
  bio: string | null;
  avatar_url: string | null;
  rate_tier: string | null;
}

interface SpecialistProfileModalProps {
  specialist: Specialist | null;
  open: boolean;
  onClose: () => void;
  onBookNow: (specialist: Specialist) => void;
}

const TIER_LABELS: Record<string, string> = {
  standard: 'Standard',
  advanced: 'Advanced',
  expert: 'Expert',
  master: 'Master',
};

const TIER_MINUTES: Record<string, number> = {
  standard: 60,
  advanced: 96,
  expert: 144,
  master: 192,
};

const SpecialistProfileModal: React.FC<SpecialistProfileModalProps> = ({
  specialist,
  open,
  onClose,
  onBookNow,
}) => {
  const [imageZoomed, setImageZoomed] = useState(false);

  if (!specialist) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTierInfo = (tier: string | null) => {
    const tierKey = tier || 'standard';
    return {
      label: TIER_LABELS[tierKey] || 'Standard',
      minutes: TIER_MINUTES[tierKey] || 60,
    };
  };

  const tierInfo = getTierInfo(specialist.rate_tier);

  return (
    <>
      {/* Profile Modal */}
      <Dialog open={open && !imageZoomed} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Specialist Profile</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center text-center space-y-4 pt-2">
            {/* Clickable Avatar */}
            <div 
              className="cursor-pointer group"
              onClick={() => specialist.avatar_url && setImageZoomed(true)}
            >
              <Avatar className="w-28 h-28 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all">
                <AvatarImage src={specialist.avatar_url || ''} alt={specialist.full_name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                  {getInitials(specialist.full_name)}
                </AvatarFallback>
              </Avatar>
              {specialist.avatar_url && (
                <p className="text-xs text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to enlarge
                </p>
              )}
            </div>

            {/* Name & Specialty */}
            <div>
              <h2 className="text-xl font-bold text-foreground">{specialist.full_name}</h2>
              <Badge variant="secondary" className="mt-2">
                {specialist.specialty}
              </Badge>
            </div>

            {/* Tier Info */}
            <div className="flex items-center gap-2 text-sm bg-muted/50 px-4 py-2 rounded-full">
              <Clock size={16} className="text-primary" />
              <span className="text-muted-foreground">{tierInfo.label} Tier:</span>
              <span className="font-semibold">{tierInfo.minutes} min/session</span>
            </div>

            {/* Tabs for Bio & Reviews */}
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="reviews" className="flex items-center gap-1">
                  <Star size={14} />
                  Reviews
                </TabsTrigger>
              </TabsList>
              <TabsContent value="about" className="mt-4">
                {specialist.bio ? (
                  <p className="text-muted-foreground text-sm leading-relaxed text-left">
                    {specialist.bio}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    No bio available
                  </p>
                )}
              </TabsContent>
              <TabsContent value="reviews" className="mt-4">
                <SpecialistReviews specialistId={specialist.id} />
              </TabsContent>
            </Tabs>

            {/* Book Button */}
            <Button 
              variant="wellness" 
              size="lg" 
              className="w-full mt-4"
              onClick={() => {
                onClose();
                onBookNow(specialist);
              }}
            >
              <Calendar size={18} />
              Book a Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zoomed Image Modal */}
      <Dialog open={imageZoomed} onOpenChange={setImageZoomed}>
        <DialogContent className="max-w-2xl p-0 bg-transparent border-0 shadow-none">
          <DialogHeader>
            <DialogTitle className="sr-only">{specialist.full_name} photo</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background rounded-full"
              onClick={() => setImageZoomed(false)}
            >
              <X size={20} />
            </Button>
            <img
              src={specialist.avatar_url || ''}
              alt={specialist.full_name}
              className="w-full max-h-[80vh] object-contain rounded-xl animate-scale-in"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SpecialistProfileModal;

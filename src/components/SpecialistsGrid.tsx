import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock } from 'lucide-react';
import BookingRequestModal from './BookingRequestModal';
import SpecialistProfileModal from './SpecialistProfileModal';

interface Specialist {
  id: string;
  full_name: string;
  specialty: string;
  bio: string | null;
  avatar_url: string | null;
  rate_tier: string | null;
}

// Minutes deducted per 1-hour session based on tier
const TIER_MINUTES: Record<string, number> = {
  standard: 60,
  advanced: 96,
  expert: 144,
  master: 192,
};

const TIER_LABELS: Record<string, string> = {
  standard: 'Standard',
  advanced: 'Advanced',
  expert: 'Expert',
  master: 'Master',
};

const SpecialistsGrid: React.FC = () => {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [profileSpecialist, setProfileSpecialist] = useState<Specialist | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    fetchSpecialists();
  }, []);

  const fetchSpecialists = async () => {
    // Use the specialists_public view which excludes sensitive data (email, hourly_rate, invitation_token)
    const { data, error } = await supabase
      .from('specialists_public')
      .select('id, full_name, specialty, bio, avatar_url, rate_tier');

    if (!error && data) {
      setSpecialists(data);
    }
    setLoading(false);
  };

  const getTierInfo = (tier: string | null) => {
    const tierKey = tier || 'standard';
    return {
      label: TIER_LABELS[tierKey] || 'Standard',
      minutes: TIER_MINUTES[tierKey] || 60,
    };
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCardClick = (specialist: Specialist) => {
    setProfileSpecialist(specialist);
  };

  const handleBookNow = (specialist: Specialist, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedSpecialist(specialist);
    setShowBookingModal(true);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (specialists.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Specialists Available</h3>
          <p className="text-muted-foreground">
            Check back soon for available wellness specialists.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {specialists.map((specialist) => (
          <Card 
            key={specialist.id} 
            className="group hover:shadow-wellness transition-all duration-300 border-0 shadow-soft cursor-pointer"
            onClick={() => handleCardClick(specialist)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                  <AvatarImage src={specialist.avatar_url || ''} alt={specialist.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(specialist.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {specialist.full_name}
                  </CardTitle>
                  <Badge variant="secondary" className="mt-1">
                    {specialist.specialty}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {specialist.bio && (
                <CardDescription className="line-clamp-3">
                  {specialist.bio}
                </CardDescription>
              )}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1 text-sm">
                  <Clock size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">{getTierInfo(specialist.rate_tier).label}:</span>
                  <span className="font-semibold text-foreground">{getTierInfo(specialist.rate_tier).minutes} min/session</span>
                </div>
                <Button 
                  variant="wellness" 
                  size="sm"
                  onClick={(e) => handleBookNow(specialist, e)}
                >
                  <Calendar size={16} />
                  Book Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Specialist Profile Modal */}
      <SpecialistProfileModal
        specialist={profileSpecialist}
        open={!!profileSpecialist}
        onClose={() => setProfileSpecialist(null)}
        onBookNow={(specialist) => {
          setSelectedSpecialist(specialist);
          setShowBookingModal(true);
        }}
      />

      {/* Booking Request Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Booking with {selectedSpecialist?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedSpecialist && (
            <BookingRequestModal 
              specialist={selectedSpecialist} 
              onClose={() => {
                setShowBookingModal(false);
                setSelectedSpecialist(null);
              }} 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SpecialistsGrid;

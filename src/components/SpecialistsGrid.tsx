import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, Star, Filter, X, MessageCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BookingRequestModal from './BookingRequestModal';
import BookingConversation from './BookingConversation';
import SpecialistProfileModal from './SpecialistProfileModal';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

interface Specialist {
  id: string;
  full_name: string;
  specialty: string;
  bio: string | null;
  avatar_url: string | null;
  rate_tier: string | null;
  avg_rating?: number;
  review_count?: number;
}

interface ActiveBooking {
  id: string;
  specialist_id: string;
  proposed_datetime: string | null;
  confirmed_datetime: string | null;
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

const RATING_OPTIONS = [
  { value: 'all', label: 'All Ratings' },
  { value: '4', label: '4+ Stars' },
  { value: '3', label: '3+ Stars' },
  { value: '2', label: '2+ Stars' },
];

const SpecialistsGrid: React.FC = () => {
  const { user } = useAuth();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [activeBookings, setActiveBookings] = useState<ActiveBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [profileSpecialist, setProfileSpecialist] = useState<Specialist | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [conversationBookingId, setConversationBookingId] = useState<string | null>(null);
  const [conversationSpecialistName, setConversationSpecialistName] = useState<string>('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  useEffect(() => {
    fetchSpecialists();
    if (user) {
      fetchActiveBookings();
    }
  }, [user]);

  // Check if specialist has an active conversation (booking with future datetime)
  const getActiveBooking = (specialistId: string): ActiveBooking | null => {
    const now = new Date();
    return activeBookings.find(booking => {
      if (booking.specialist_id !== specialistId) return false;
      const bookingTime = booking.confirmed_datetime || booking.proposed_datetime;
      if (!bookingTime) return false;
      return new Date(bookingTime) > now;
    }) || null;
  };

  const hasActiveConversation = (specialistId: string): boolean => {
    return getActiveBooking(specialistId) !== null;
  };

  // Get active booking IDs for unread message tracking
  const activeBookingIds = useMemo(() => {
    const now = new Date();
    return activeBookings
      .filter(booking => {
        const bookingTime = booking.confirmed_datetime || booking.proposed_datetime;
        return bookingTime && new Date(bookingTime) > now;
      })
      .map(b => b.id);
  }, [activeBookings]);

  const { unreadCounts, markAsRead } = useUnreadMessages(activeBookingIds);

  // Get unread count for a specialist's active booking
  const getUnreadCount = (specialistId: string): number => {
    const activeBooking = getActiveBooking(specialistId);
    if (!activeBooking) return 0;
    return unreadCounts[activeBooking.id] || 0;
  };

  const fetchActiveBookings = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('bookings')
      .select('id, specialist_id, proposed_datetime, confirmed_datetime')
      .eq('employee_user_id', user.id)
      .in('status', ['pending', 'approved']);
    
    if (data) {
      setActiveBookings(data);
    }
  };

  // Get unique specialties for filter dropdown
  const specialties = useMemo(() => {
    const unique = [...new Set(specialists.map(s => s.specialty))].sort();
    return unique;
  }, [specialists]);

  // Filter specialists based on selected filters
  const filteredSpecialists = useMemo(() => {
    return specialists.filter(s => {
      const matchesSpecialty = specialtyFilter === 'all' || s.specialty === specialtyFilter;
      const minRating = ratingFilter === 'all' ? 0 : parseInt(ratingFilter);
      const matchesRating = ratingFilter === 'all' || (s.avg_rating && s.avg_rating >= minRating);
      return matchesSpecialty && matchesRating;
    });
  }, [specialists, specialtyFilter, ratingFilter]);

  const hasActiveFilters = specialtyFilter !== 'all' || ratingFilter !== 'all';

  const clearFilters = () => {
    setSpecialtyFilter('all');
    setRatingFilter('all');
  };

  const fetchSpecialists = async () => {
    // Use the specialists_public view which excludes sensitive data
    const { data, error } = await supabase
      .from('specialists_public')
      .select('id, full_name, specialty, bio, avatar_url, rate_tier');

    if (!error && data) {
      // Fetch review stats for all specialists
      const specialistIds = data.map(s => s.id).filter(Boolean) as string[];
      
      const { data: reviews } = await supabase
        .from('specialist_reviews')
        .select('specialist_id, rating')
        .in('specialist_id', specialistIds);

      // Calculate avg rating and count per specialist
      const reviewStats = new Map<string, { total: number; count: number }>();
      reviews?.forEach(r => {
        const existing = reviewStats.get(r.specialist_id) || { total: 0, count: 0 };
        reviewStats.set(r.specialist_id, {
          total: existing.total + r.rating,
          count: existing.count + 1,
        });
      });

      const specialistsWithRatings = data.map(s => ({
        ...s,
        avg_rating: reviewStats.get(s.id!)?.total 
          ? Math.round((reviewStats.get(s.id!)!.total / reviewStats.get(s.id!)!.count) * 10) / 10
          : undefined,
        review_count: reviewStats.get(s.id!)?.count || 0,
      }));

      setSpecialists(specialistsWithRatings as Specialist[]);
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

  const handleOpenConversation = (specialist: Specialist, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const activeBooking = getActiveBooking(specialist.id);
    if (activeBooking) {
      setConversationBookingId(activeBooking.id);
      setConversationSpecialistName(specialist.full_name);
      // Mark messages as read when opening conversation
      markAsRead(activeBooking.id);
    }
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
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter size={16} />
          <span>Filter by:</span>
        </div>
        
        <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Specialty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            {specialties.map(specialty => (
              <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            {RATING_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.value !== 'all' && <Star size={12} className="inline fill-yellow-400 text-yellow-400 mr-1" />}
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X size={14} />
            Clear
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {filteredSpecialists.length} specialist{filteredSpecialists.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSpecialists.map((specialist) => {
          const isActive = hasActiveConversation(specialist.id);
          const unreadCount = getUnreadCount(specialist.id);
          
          return (
            <Card 
              key={specialist.id} 
              className={cn(
                "group transition-all duration-300 border-0 cursor-pointer relative",
                isActive 
                  ? "bg-emerald-600 text-white shadow-lg hover:bg-emerald-700" 
                  : "hover:shadow-wellness shadow-soft"
              )}
              onClick={() => handleCardClick(specialist)}
            >
              {/* Unread message badge */}
              {isActive && unreadCount > 0 && (
                <div className="absolute -top-2 -right-2 z-10">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-lg animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className={cn(
                      "w-16 h-16 ring-2 transition-all",
                      isActive 
                        ? "ring-white/30 group-hover:ring-white/50" 
                        : "ring-primary/10 group-hover:ring-primary/30"
                    )}>
                      <AvatarImage src={specialist.avatar_url || ''} alt={specialist.full_name} />
                      <AvatarFallback className={cn(
                        "font-semibold",
                        isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                      )}>
                        {getInitials(specialist.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    {isActive && (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                        <MessageCircle size={14} className="text-emerald-600 fill-emerald-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <CardTitle className={cn(
                      "text-lg transition-colors",
                      isActive ? "text-white" : "group-hover:text-primary"
                    )}>
                      {specialist.full_name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={isActive ? "outline" : "secondary"} className={isActive ? "border-white/50 text-white" : ""}>
                        {specialist.specialty}
                      </Badge>
                      {specialist.avg_rating && specialist.review_count && specialist.review_count > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star size={14} className="fill-yellow-400 text-yellow-400" />
                          <span className={cn("font-medium", isActive && "text-white")}>{specialist.avg_rating}</span>
                          <span className={isActive ? "text-white/70" : "text-muted-foreground"}>({specialist.review_count})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {specialist.bio && (
                  <CardDescription className={cn("line-clamp-3", isActive && "text-white/80")}>
                    {specialist.bio}
                  </CardDescription>
                )}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1 text-sm">
                    <Clock size={14} className={isActive ? "text-white/70" : "text-muted-foreground"} />
                    <span className={isActive ? "text-white/70" : "text-muted-foreground"}>{getTierInfo(specialist.rate_tier).label}:</span>
                    <span className={cn("font-semibold", isActive ? "text-white" : "text-foreground")}>{getTierInfo(specialist.rate_tier).minutes} min/session</span>
                  </div>
                  <Button 
                    variant={isActive ? "secondary" : "wellness"} 
                    size="sm"
                    className={isActive ? "bg-white text-emerald-600 hover:bg-white/90" : ""}
                    onClick={(e) => isActive ? handleOpenConversation(specialist, e) : handleBookNow(specialist, e)}
                  >
                    {isActive ? <MessageCircle size={16} /> : <Calendar size={16} />}
                    {isActive ? "Message" : "Book Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
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

      {/* Conversation Modal */}
      <Dialog open={!!conversationBookingId} onOpenChange={(open) => !open && setConversationBookingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conversation with {conversationSpecialistName}</DialogTitle>
          </DialogHeader>
          {conversationBookingId && (
            <BookingConversation 
              bookingId={conversationBookingId}
              userType="employee"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SpecialistsGrid;

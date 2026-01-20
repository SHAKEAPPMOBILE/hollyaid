import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  employee_name?: string;
}

interface SpecialistReviewsProps {
  specialistId: string;
}

const SpecialistReviews: React.FC<SpecialistReviewsProps> = ({ specialistId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [specialistId]);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('specialist_reviews')
      .select('id, rating, comment, created_at, employee_user_id')
      .eq('specialist_id', specialistId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      // Fetch employee names
      const employeeIds = data.map(r => r.employee_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', employeeIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const reviewsWithNames = data.map(r => ({
        ...r,
        employee_name: profileMap.get(r.employee_user_id) || 'Anonymous',
      }));

      setReviews(reviewsWithNames);

      // Calculate average
      if (data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    }
    setLoading(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderStars = (rating: number, size: number = 14) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={cn(
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No reviews yet
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Average Rating Summary */}
      <div className="flex items-center justify-center gap-3 pb-2 border-b">
        <div className="flex items-center gap-1">
          {renderStars(Math.round(averageRating), 18)}
        </div>
        <span className="text-lg font-semibold">{averageRating}</span>
        <span className="text-sm text-muted-foreground">
          ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
        </span>
      </div>

      {/* Reviews List */}
      <div className="space-y-4 max-h-60 overflow-y-auto">
        {reviews.map((review) => (
          <div key={review.id} className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs bg-muted">
                {getInitials(review.employee_name || 'A')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{review.employee_name}</span>
                {renderStars(review.rating, 12)}
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                  {review.comment}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(review.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpecialistReviews;

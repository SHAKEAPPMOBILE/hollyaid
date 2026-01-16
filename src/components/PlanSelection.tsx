import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Zap, TrendingUp, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Plan {
  id: string;
  name: string;
  price: number;
  minutes: number;
  hours: string;
  priceId: string;
  icon: React.ReactNode;
  popular?: boolean;
}

export const WELLNESS_PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 340,
    minutes: 500,
    hours: '8.3',
    priceId: 'price_1SqEi7GdNaB1L9YZi2z1wViF',
    icon: <Zap className="w-6 h-6" />,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 950,
    minutes: 1500,
    hours: '25',
    priceId: 'price_1SqEiJGdNaB1L9YZCJqfjMTg',
    icon: <TrendingUp className="w-6 h-6" />,
    popular: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 1850,
    minutes: 3600,
    hours: '60',
    priceId: 'price_1SqEiVGdNaB1L9YZBSASxzco',
    icon: <Building2 className="w-6 h-6" />,
  },
];

interface PlanSelectionProps {
  onSelectPlan: (plan: Plan) => void;
  loading?: boolean;
  selectedPlanId?: string;
}

const PlanSelection: React.FC<PlanSelectionProps> = ({ 
  onSelectPlan, 
  loading, 
  selectedPlanId 
}) => {
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose Your Wellness Minutes Plan</h2>
        <p className="text-muted-foreground mt-2">
          Purchase monthly wellness minutes for your team
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {WELLNESS_PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
              plan.popular && "border-primary shadow-md",
              hoveredPlan === plan.id && "scale-[1.02]",
              selectedPlanId === plan.id && loading && "opacity-75"
            )}
            onMouseEnter={() => setHoveredPlan(plan.id)}
            onMouseLeave={() => setHoveredPlan(null)}
            onClick={() => !loading && onSelectPlan(plan)}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10 text-primary w-fit">
                {plan.icon}
              </div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>
                {plan.minutes.toLocaleString()} minutes/month
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              
              <div className="text-sm text-muted-foreground">
                ≈ {plan.hours} hours of wellness sessions
              </div>

              <ul className="space-y-2 text-sm text-left">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>{plan.minutes.toLocaleString()} wellness minutes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Access to all specialists</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Unlimited employees</span>
                </li>
              </ul>

              <Button 
                variant={plan.popular ? "wellness" : "outline"} 
                className="w-full"
                disabled={loading}
              >
                {loading && selectedPlanId === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Select Plan'
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Minutes are used when employees book sessions with specialists. 
        Unused minutes expire at the end of each billing period.
      </p>
    </div>
  );
};

export default PlanSelection;

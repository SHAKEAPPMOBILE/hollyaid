import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, TrendingUp, Zap, AlertTriangle } from 'lucide-react';
import { PLANS } from '@/lib/plans';

interface MinutesUsageTrackerProps {
  company: {
    plan_type: string | null;
    minutes_included: number | null;
    minutes_used: number | null;
    subscription_period_end: string | null;
  };
}

const MinutesUsageTracker: React.FC<MinutesUsageTrackerProps> = ({ company }) => {
  const planType = company.plan_type || 'starter';
  const minutesIncluded = company.minutes_included || 0;
  const minutesUsed = company.minutes_used || 0;
  const minutesRemaining = Math.max(0, minutesIncluded - minutesUsed);
  const usagePercentage = minutesIncluded > 0 ? (minutesUsed / minutesIncluded) * 100 : 0;
  
  const plan = PLANS.find(p => p.id === planType) || PLANS[0];
  
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getDaysRemaining = () => {
    if (!company.subscription_period_end) return null;
    const endDate = new Date(company.subscription_period_end);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysRemaining = getDaysRemaining();
  const isLowOnMinutes = usagePercentage > 80;

  return (
    <div className="space-y-6">
      {/* Main Usage Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Wellness Minutes
              </CardTitle>
              <CardDescription>
                {plan.name} Plan • {plan.hours} hours/month
              </CardDescription>
            </div>
            {isLowOnMinutes && (
              <div className="flex items-center gap-1 text-amber-500 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Running low</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-4xl font-bold text-foreground">
                {formatMinutes(minutesRemaining)}
              </span>
              <span className="text-muted-foreground ml-2">remaining</span>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              {formatMinutes(minutesUsed)} of {formatMinutes(minutesIncluded)} used
            </div>
          </div>
          
          <Progress 
            value={usagePercentage} 
            className="h-3"
          />
          
          {daysRemaining !== null && (
            <p className="text-sm text-muted-foreground">
              {daysRemaining} days until renewal
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Minutes Used</p>
                <p className="text-2xl font-semibold">{formatMinutes(minutesUsed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-semibold">{formatMinutes(minutesRemaining)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plan Allowance</p>
                <p className="text-2xl font-semibold">{formatMinutes(minutesIncluded)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Info */}
      <Card className="bg-secondary/30">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-3">Specialist Tier Multipliers</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Minutes are deducted based on the specialist's tier. Higher tiers use more minutes per session hour.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { tier: 'Standard', multiplier: 1, color: 'bg-slate-500' },
              { tier: 'Advanced', multiplier: 1.6, color: 'bg-blue-500' },
              { tier: 'Expert', multiplier: 2.4, color: 'bg-purple-500' },
              { tier: 'Master', multiplier: 3.2, color: 'bg-amber-500' },
            ].map((t) => (
              <div key={t.tier} className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${t.color}`} />
                <span className="text-muted-foreground">{t.tier}:</span>
                <span className="font-medium">{t.multiplier}x</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MinutesUsageTracker;

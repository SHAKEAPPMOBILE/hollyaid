import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Clock, TrendingUp, Zap, AlertTriangle, XCircle, ArrowUpCircle, Check, Building2, Loader2 } from 'lucide-react';
import { WELLNESS_PLANS, PLANS, isTestAccountEmail } from '@/lib/plans';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MinutesUsageTrackerProps {
  company: {
    plan_type: string | null;
    minutes_included: number | null;
    minutes_used: number | null;
    subscription_period_end: string | null;
  };
}

const MinutesUsageTracker: React.FC<MinutesUsageTrackerProps> = ({ company }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const planType = company.plan_type || 'starter';
  const minutesIncluded = company.minutes_included || 0;
  const minutesUsed = company.minutes_used || 0;
  const minutesRemaining = Math.max(0, minutesIncluded - minutesUsed);
  const usagePercentage = minutesIncluded > 0 ? (minutesUsed / minutesIncluded) * 100 : 0;
  
  const currentPlan = PLANS.find(p => p.id === planType) || PLANS[0];
  const currentPlanIndex = PLANS.findIndex(p => p.id === planType);
  const availableUpgrades = PLANS.filter((_, index) => index > currentPlanIndex);
  
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const rawMins = minutes % 60;
    // Round to nearest 15-minute increment (00, 15, 30, 45)
    const roundedMins = Math.round(rawMins / 15) * 15;
    const displayMins = roundedMins === 60 ? 0 : roundedMins;
    const displayHours = roundedMins === 60 ? hours + 1 : hours;
    const minsStr = displayMins.toString().padStart(2, '0');
    
    if (displayHours === 0) return `${minsStr}m`;
    if (displayMins === 0) return `${displayHours}h`;
    return `${displayHours}h ${minsStr}m`;
  };

  const getDaysRemaining = () => {
    if (!company.subscription_period_end) return null;
    const endDate = new Date(company.subscription_period_end);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleUpgradePlan = async (newPlanId: string) => {
    if (!user?.email) return;
    
    setSelectedPlanId(newPlanId);
    setUpgradeLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planType: newPlanId },
      });

      if (error) throw error;

      // For test accounts, show success immediately
      if (data.isTestAccount) {
        toast({
          title: "Plan upgraded!",
          description: `Your plan has been upgraded to ${newPlanId}. Refresh to see changes.`,
        });
        setUpgradeModalOpen(false);
        window.location.reload();
        return;
      }

      // For regular accounts, redirect to Stripe
      if (data.url) {
        window.open(data.url, '_blank');
        setUpgradeModalOpen(false);
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: "Upgrade failed",
        description: "Unable to process upgrade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpgradeLoading(false);
      setSelectedPlanId(null);
    }
  };

  const daysRemaining = getDaysRemaining();
  const isLowOnMinutes = usagePercentage >= 80;
  const isCriticallyLow = usagePercentage >= 95;
  const canUpgrade = availableUpgrades.length > 0;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">{currentPlan.name} Plan</CardTitle>
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    Active
                  </Badge>
                </div>
                <CardDescription className="text-base">
                  ${currentPlan.price}/month • {currentPlan.hours} hours of wellness sessions
                </CardDescription>
              </div>
            </div>
            {canUpgrade && (
              <Button 
                onClick={() => setUpgradeModalOpen(true)}
                className="gap-2"
              >
                <ArrowUpCircle className="h-4 w-4" />
                Upgrade Plan
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-primary/10">
            <div className="text-center p-3">
              <p className="text-sm text-muted-foreground">Monthly Minutes</p>
              <p className="text-2xl font-bold text-foreground">{currentPlan.minutes.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 border-x border-primary/10">
              <p className="text-sm text-muted-foreground">Price per Minute</p>
              <p className="text-2xl font-bold text-foreground">${(currentPlan.price / currentPlan.minutes).toFixed(2)}</p>
            </div>
            <div className="text-center p-3">
              <p className="text-sm text-muted-foreground">Renewal</p>
              <p className="text-2xl font-bold text-foreground">
                {daysRemaining !== null ? `${daysRemaining}d` : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Low Minutes Warning Alert */}
      {isLowOnMinutes && (
        <Alert variant={isCriticallyLow ? "destructive" : "default"} className={isCriticallyLow ? "" : "border-amber-500 bg-amber-500/10"}>
          {isCriticallyLow ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          <AlertTitle className={isCriticallyLow ? "" : "text-amber-700 dark:text-amber-400"}>
            {isCriticallyLow ? "Minutes Almost Depleted" : "Low Minutes Warning"}
          </AlertTitle>
          <AlertDescription className={isCriticallyLow ? "" : "text-amber-600 dark:text-amber-300"}>
            {isCriticallyLow 
              ? `You have only ${formatMinutes(minutesRemaining)} remaining. Consider upgrading your plan to avoid service interruption.`
              : `You've used ${Math.round(usagePercentage)}% of your monthly wellness minutes. ${formatMinutes(minutesRemaining)} remaining.`
            }
            {canUpgrade && (
              <Button 
                variant="link" 
                className="p-0 h-auto ml-2 text-inherit underline"
                onClick={() => setUpgradeModalOpen(true)}
              >
                Upgrade now
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Minutes Usage Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Minutes Remaining
              </CardTitle>
              <CardDescription>
                Track your wellness minutes usage
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
              {daysRemaining} days until renewal • Minutes reset on renewal
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

      {/* Upgrade Plan Modal */}
      <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              Get more wellness minutes for your team. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              {PLANS.map((plan, index) => {
                const isCurrentPlan = plan.id === planType;
                const isDowngrade = index < currentPlanIndex;
                const isUpgrade = index > currentPlanIndex;
                
                return (
                  <Card 
                    key={plan.id}
                    className={cn(
                      "relative transition-all",
                      isCurrentPlan && "border-primary border-2 bg-primary/5",
                      isUpgrade && "cursor-pointer hover:border-primary/50 hover:shadow-md",
                      isDowngrade && "opacity-50"
                    )}
                    onClick={() => isUpgrade && !upgradeLoading && handleUpgradePlan(plan.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isCurrentPlan ? "bg-primary/20" : "bg-secondary"
                          )}>
                            <Building2 className={cn(
                              "h-5 w-5",
                              isCurrentPlan ? "text-primary" : "text-muted-foreground"
                            )} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{plan.name}</h4>
                              {isCurrentPlan && (
                                <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                                  Current Plan
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {plan.minutes.toLocaleString()} minutes • {plan.hours} hours/month
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">${plan.price}</p>
                          <p className="text-sm text-muted-foreground">/month</p>
                        </div>
                      </div>
                      
                      {isUpgrade && (
                        <div className="mt-3 pt-3 border-t flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-emerald-500" />
                            <span>+{(plan.minutes - currentPlan.minutes).toLocaleString()} more minutes</span>
                          </div>
                          <Button 
                            size="sm" 
                            disabled={upgradeLoading}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpgradePlan(plan.id);
                            }}
                          >
                            {upgradeLoading && selectedPlanId === plan.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <ArrowUpCircle className="h-4 w-4 mr-2" />
                                Upgrade
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Upgrades are prorated. You'll only pay the difference for the remaining billing period.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MinutesUsageTracker;

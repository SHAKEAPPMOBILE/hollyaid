import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Check, TrendingUp, Zap } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const additionalOffersByPlanId: Record<string, string[]> = {
  starter: ["Simple monthly setup"],
  growth: ["Priority specialist matching"],
  scale: ["Priority specialist matching", "Custom rollout support"],
};

function iconForPlan(planId: string) {
  if (planId === "starter") return Zap;
  if (planId === "growth") return TrendingUp;
  return Building2;
}

export function PricingPackagesSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("pricing-packages-section");
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const plans = useMemo(() => PLANS, []);

  return (
    <section
      id="pricing-packages-section"
      className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-muted/30 to-background px-4 sm:px-6"
    >
      <div className="container mx-auto max-w-7xl">
        <div
          className={`mx-auto max-w-3xl text-center mb-10 transition-all duration-1000 ${
            isVisible ? "animate-slide-in-up" : "opacity-0"
          }`}
        >
          <h2 className="font-sans text-2xl font-bold text-foreground sm:text-3xl mb-4 text-balance">
            Packages and what we offer
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Choose the monthly wellness minutes package that fits your team and get direct access to our specialist
            network.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan, index) => {
            const Icon = iconForPlan(plan.id);
            const isPopular = plan.id === "growth";
            const offers = additionalOffersByPlanId[plan.id] ?? [];

            return (
              <Card
                key={plan.id}
                className={`relative border-border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  isPopular ? "border-primary shadow-md" : ""
                } ${isVisible ? "animate-slide-in-up" : "opacity-0"}`}
                style={{ animationDelay: `${index * 120}ms` }}
              >
                {isPopular ? (
                  <div className="absolute top-4 right-4 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Most popular
                  </div>
                ) : null}

                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.minutes.toLocaleString()} minutes / month</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-center">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                    <p className="text-sm text-muted-foreground mt-2">≈ {plan.hours} hours of wellness sessions</p>
                  </div>

                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Access to all specialists</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Unlimited employees</span>
                    </li>
                    {offers.map((offer) => (
                      <li key={offer} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>{offer}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button asChild variant="wellness" size="lg">
            <Link to="/auth">Choose your package</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

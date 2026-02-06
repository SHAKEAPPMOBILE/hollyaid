import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Building2, BookOpen, DollarSign } from "lucide-react";

type BenefitColor = "primary" | "secondary" | "accent" | "chart-1";

const benefits: Array<{
  icon: typeof TrendingUp;
  title: string;
  description: string;
  color: BenefitColor;
}> = [
  {
    icon: TrendingUp,
    title: "Expand Your Reach",
    description:
      "Connect with companies globally and reach thousands of employees seeking holistic wellness solutions.",
    color: "primary",
  },
  {
    icon: Building2,
    title: "Corporate Partnerships",
    description:
      "Work directly with forward-thinking companies that prioritize employee well-being and holistic health.",
    color: "secondary",
  },
  {
    icon: BookOpen,
    title: "Professional Growth",
    description:
      "Access resources, training, and a community of like-minded practitioners to enhance your practice.",
    color: "accent",
  },
  {
    icon: DollarSign,
    title: "Flexible Income",
    description: "Set your own schedule and rates while earning from multiple corporate wellness programs.",
    color: "chart-1",
  },
];

function getColorClasses(color: BenefitColor) {
  switch (color) {
    case "primary":
      return { badgeBg: "bg-primary/20", icon: "text-primary" };
    case "secondary":
      return { badgeBg: "bg-secondary/20", icon: "text-secondary" };
    case "accent":
      return { badgeBg: "bg-accent/20", icon: "text-accent" };
    case "chart-1":
      return { badgeBg: "bg-primary/20", icon: "text-primary" };
    default:
      return { badgeBg: "bg-primary/20", icon: "text-primary" };
  }
}

export function BenefitsSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("benefits-section");
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const computed = useMemo(() => benefits.map((b) => ({ ...b, classes: getColorClasses(b.color) })), []);

  return (
    <section
      id="benefits-section"
      className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-background to-muted/30 px-12 sm:px-16 lg:px-24"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`mx-auto max-w-3xl text-center mb-12 transition-all duration-1000 ${
            isVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
        >
          <h2 className="font-sans text-2xl font-bold gradient-text sm:text-3xl mb-4 text-balance">
            Why Join Hollyaid as a wellness specialist?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
            Be part of a revolutionary platform that's transforming workplace wellness through holistic health practices.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {computed.map((benefit, index) => (
            <Card
              key={benefit.title}
              className={`gradient-border hover:shadow-xl transition-all duration-500 animate-scale-hover ${
                isVisible ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <CardContent className="p-6 text-center relative z-10">
                <div className="mb-4 flex justify-center">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full ${benefit.classes.badgeBg} animate-glow-hover`}
                  >
                    <benefit.icon className={`h-7 w-7 ${benefit.classes.icon}`} />
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-semibold text-card-foreground">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

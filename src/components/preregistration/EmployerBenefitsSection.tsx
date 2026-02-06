import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, ShieldCheck, Globe2, Layers, Megaphone } from "lucide-react";

type BenefitColor = "primary" | "secondary" | "accent" | "chart-1";

const employerBenefits: Array<{
  icon: typeof HeartPulse;
  title: string;
  description: string;
  color: BenefitColor;
}> = [
  {
    icon: HeartPulse,
    title: "Improve Employee Well-Being & Morale",
    description:
      "Offer proactive, holistic care that supports mental, emotional, and physical wellness—reducing stress and improving engagement.",
    color: "primary",
  },
  {
    icon: ShieldCheck,
    title: "Access to Trusted Specialists",
    description:
      "Connect your teams with a vetted network of certified wellness professionals across multiple modalities.",
    color: "secondary",
  },
  {
    icon: Globe2,
    title: "Global Reach & Diverse Options",
    description:
      "Support a distributed workforce with multi-timezone coverage and culturally diverse specialists.",
    color: "accent",
  },
  {
    icon: Layers,
    title: "Flexible & Scalable Wellness Programs",
    description:
      "Start small and scale seamlessly—mix 1:1 sessions, group workshops, and ongoing programs to fit your needs.",
    color: "chart-1",
  },
  {
    icon: Megaphone,
    title: "Employer Branding & Forward-Thinking Culture",
    description: "Demonstrate a real commitment to employee well-being to attract and retain top talent.",
    color: "primary",
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

export function EmployerBenefitsSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("employer-benefits-section");
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const computed = useMemo(
    () => employerBenefits.map((b) => ({ ...b, classes: getColorClasses(b.color) })),
    []
  );

  return (
    <section
      id="employer-benefits-section"
      className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-muted/30 to-background px-12 sm:px-16 lg:px-24"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`mx-auto max-w-3xl text-center mb-12 transition-all duration-1000 ${
            isVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
        >
          <h2 className="font-sans text-2xl font-bold gradient-text sm:text-3xl mb-4 text-balance">
            Why join Hollyaid as employer?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
            Elevate your workplace well-being with tailored, holistic care your teams will actually use.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {computed.slice(0, 3).map((benefit, index) => (
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

        <div className="mt-6 mx-auto max-w-5xl grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
          {computed.slice(3).map((benefit, i) => (
            <Card
              key={benefit.title}
              className={`gradient-border hover:shadow-xl transition-all duration-500 animate-scale-hover ${
                isVisible ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${(i + 3) * 200}ms` }}
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

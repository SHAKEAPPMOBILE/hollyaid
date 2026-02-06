import { useEffect, useState } from "react";
import { SpecialistRegistrationForm } from "@/components/preregistration/SpecialistRegistrationForm";

export function RegistrationSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("registration");
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <section id="registration" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`mx-auto max-w-3xl text-center mb-12 transition-all duration-1000 ${
            isVisible ? "animate-slide-in-up" : "opacity-0"
          }`}
        >
          <h2 className="font-sans text-2xl font-bold text-primary sm:text-3xl mb-4 text-balance">
            Ready to Join Our Network?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
            Pre-register now to be among the first specialists on our platform when we launch.
          </p>
        </div>

        <div
          className={`mx-auto max-w-2xl transition-all duration-1000 delay-300 ${
            isVisible ? "animate-slide-in-up" : "opacity-0"
          }`}
        >
          <SpecialistRegistrationForm />
        </div>
      </div>
    </section>
  );
}

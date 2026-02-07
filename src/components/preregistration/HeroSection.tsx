import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToRegistration = () => {
    document.getElementById("registration")?.scrollIntoView({ behavior: "smooth" });
  };

  const preregCtas = (
    <div className="flex flex-col sm:flex-row gap-6 mt-8 mb-8">
      <div className="flex flex-col items-center sm:items-start">
        <p className="text-sm font-normal text-muted-foreground/80 mb-1.5">Are you a wellness specialist?</p>
        <button
          type="button"
          onClick={scrollToRegistration}
          className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
        >
          Pre-register Now
        </button>
      </div>
      <div className="flex flex-col items-center sm:items-start">
        <p className="text-sm font-normal text-muted-foreground/80 mb-1.5">Are you a company?</p>
        <button
          type="button"
          onClick={() => {
            const subject = encodeURIComponent("Company Inquiry - Let's Chat");
            const body = encodeURIComponent("Hello,\n\nI'd like to know more about Hollyaid.");
            const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=info@hollyaid.com&su=${subject}&body=${body}`;
            window.open(gmailLink, "_blank");
          }}
          className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-primary border-2 border-primary rounded-md hover:bg-accent/10 transition-colors"
        >
          Let's Chat
        </button>
      </div>
    </div>
  );

  return (
    <section className="relative min-h-screen bg-background py-12 sm:py-16 lg:py-24 px-12 sm:px-16 lg:px-24">
      <div className="container mx-auto h-full">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 h-full">
          <div
            className={`w-full lg:w-1/2 transition-all duration-1000 ${
              isVisible ? "animate-fade-in-left" : "opacity-0"
            }`}
          >
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <div className="flex items-center space-x-2">
                <div className="h-12 w-12 flex items-center justify-center rounded-full">
                  <img src="/logo-hollyaid.png" alt="logo" />
                </div>
                <h1 className="text-3xl font-bold text-primary">Hollyaid</h1>
              </div>
            </div>

            <h2 className="mb-4 font-sans text-2xl font-bold leading-tight text-foreground sm:text-3xl lg:text-4xl text-balance text-center lg:text-left">
              Join a Community of Certified Wellness Specialists
            </h2>

            <p className="mb-6 text-lg text-muted-foreground leading-relaxed text-pretty text-center lg:text-left">
              At Hollyaid, we want to make workplace wellness easy and accessible. Caring for your team’s well-being is simple,
              effective, and truly rewarding.
            </p>

            <div className="mt-8 mb-8 flex justify-center lg:justify-start sm:hidden w-full">
              <Button
                asChild
                variant="wellness"
                className="w-full px-6 py-3 text-base font-medium"
              >
                <Link to="/auth">Enter Hollyaid</Link>
              </Button>
            </div>

            <div className="hidden sm:block">{preregCtas}</div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
              <div className="text-center lg:text-left p-4 rounded-lg bg-card border border-border hover:border-primary/40 transition-all duration-300 animate-scale-hover shadow-sm">
                <div className="text-2xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Companies Waiting</div>
              </div>
              <div className="text-center lg:text-left p-4 rounded-lg bg-card border border-border hover:border-secondary/40 transition-all duration-300 animate-scale-hover shadow-sm">
                <div className="text-2xl font-bold text-secondary">50+</div>
                <div className="text-sm text-muted-foreground">Target Countries</div>
              </div>
              <div className="text-center lg:text-left p-4 rounded-lg bg-card border border-border hover:border-accent/40 transition-all duration-300 animate-scale-hover shadow-sm">
                <div className="text-2xl font-bold text-accent">10k+</div>
                <div className="text-sm text-muted-foreground">Lives to Improve</div>
              </div>
            </div>
          </div>

          <div
            className={`w-full p-2 lg:w-1/2 flex flex-col items-center justify-center transition-all duration-1000 delay-300 ${
              isVisible ? "animate-fade-in-right" : "opacity-0"
            }`}
          >
            <img
              src="/landing-page-img.jpg"
              alt="landing"
              className="max-w-[400px] rounded-xl shadow-2xl transition-all duration-500"
            />
            <img
              src="/why-join-img.jpg"
              alt="why join"
              className="max-w-[400px] mt-5 rounded-xl shadow-2xl transition-all duration-500"
            />

            <div className="w-full max-w-[400px] sm:hidden">{preregCtas}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

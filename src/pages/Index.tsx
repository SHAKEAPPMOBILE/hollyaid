import React from 'react';
import { Link } from "react-router-dom";
import { BenefitsSection } from "@/components/preregistration/BenefitsSection";
import { EmployerBenefitsSection } from "@/components/preregistration/EmployerBenefitsSection";
import { Footer } from "@/components/preregistration/Footer";
import { HeroSection } from "@/components/preregistration/HeroSection";
import { RegistrationSection } from "@/components/preregistration/RegistrationSection";
import { TestimonialsSection } from "@/components/preregistration/TestimonialsSection";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <header className="fixed top-0 right-0 z-50 p-4 hidden sm:block">
        <Button asChild variant="wellness" size="sm">
          <Link to="/auth">Enter Hollyaid</Link>
        </Button>
      </header>
      <HeroSection />
      <BenefitsSection />
      <EmployerBenefitsSection />
      <TestimonialsSection />
      <RegistrationSection />
      <Footer />
    </main>
  );
};

export default Index;
import React from 'react';
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BenefitsSection } from "@/components/preregistration/BenefitsSection";
import { EmployerBenefitsSection } from "@/components/preregistration/EmployerBenefitsSection";
import { Footer } from "@/components/preregistration/Footer";
import { HeroSection } from "@/components/preregistration/HeroSection";
import { PricingPackagesSection } from "@/components/preregistration/PricingPackagesSection";
import { RegistrationSection } from "@/components/preregistration/RegistrationSection";
import { TestimonialsSection } from "@/components/preregistration/TestimonialsSection";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "@/i18n";

const countryLanguageOptions: Array<{ country: string; flag: string; language: SupportedLanguageCode }> = [
  { country: "USA", flag: "🇺🇸", language: "en" },
  { country: "Canada", flag: "🇨🇦", language: "en" },
  { country: "Mexico", flag: "🇲🇽", language: "es" },
  { country: "Colombia", flag: "🇨🇴", language: "es" },
  { country: "Brazil", flag: "🇧🇷", language: "pt" },
  { country: "Portugal", flag: "🇵🇹", language: "pt" },
  { country: "Spain", flag: "🇪🇸", language: "es" },
  { country: "France", flag: "🇫🇷", language: "fr" },
  { country: "Germany", flag: "🇩🇪", language: "de" },
  { country: "Switzerland", flag: "🇨🇭", language: "de" },
  { country: "Italy", flag: "🇮🇹", language: "it" },
  { country: "UK", flag: "🇬🇧", language: "en" },
  { country: "Netherlands", flag: "🇳🇱", language: "nl" },
  { country: "Belgium", flag: "🇧🇪", language: "fr" },
];

const Index = () => {
  const { i18n } = useTranslation();
  const currentLanguage = (i18n.language || "en").slice(0, 2) as SupportedLanguageCode;

  const handleCountryLanguageClick = async (language: SupportedLanguageCode) => {
    await i18n.changeLanguage(language);
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="fixed top-0 inset-x-0 z-50 p-4 hidden lg:block">
        <div className="container mx-auto max-w-7xl flex justify-end">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-3 py-2 shadow-sm backdrop-blur-md">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">We operate in</span>

            <div className="flex items-center gap-1">
              {countryLanguageOptions.map((option) => {
                const languageLabel = SUPPORTED_LANGUAGES.find((lang) => lang.code === option.language)?.label || option.language;
                const isActive = option.language === currentLanguage;

                return (
                  <button
                    key={option.country}
                    type="button"
                    onClick={() => void handleCountryLanguageClick(option.language)}
                    title={`${option.country} · ${languageLabel}`}
                    aria-label={`Switch language to ${languageLabel} via ${option.country}`}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm transition-transform hover:scale-110 ${
                      isActive ? "ring-2 ring-primary/60 bg-primary/10" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    {option.flag}
                  </button>
                );
              })}
            </div>

            <Button asChild variant="wellness" size="sm">
              <Link to="/auth">Enter Hollyaid</Link>
            </Button>
          </div>
        </div>
      </header>
      <header className="fixed top-0 right-0 z-50 p-4 hidden sm:block lg:hidden">
        <Button asChild variant="wellness" size="sm">
          <Link to="/auth">Enter Hollyaid</Link>
        </Button>
      </header>
      <HeroSection />
      <TestimonialsSection />
      <PricingPackagesSection />
      <BenefitsSection />
      <EmployerBenefitsSection />
      <RegistrationSection />
      <Footer />
    </main>
  );
};

export default Index;
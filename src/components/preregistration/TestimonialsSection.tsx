import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { preregSupabase } from "@/components/preregistration/supabase";
import { Link } from "react-router-dom";

interface Specialist {
  id: string;
  full_name: string;
  specialty: string;
  profile_photo_url: string | null;
  bio: string | null;
  languages: string[] | string | null;
  time_zone: string | null;
  created_at: string;
}

const parseLanguages = (languages: string[] | string | null): string[] => {
  if (!languages) return [];
  if (Array.isArray(languages)) return languages;
  try {
    const parsed = JSON.parse(languages);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return typeof languages === "string"
      ? languages.split(",").map((lang) => lang.trim().replace(/[\[\]\"']/g, ""))
      : [];
  }
};

export function TestimonialsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("testimonials-section");
    if (element) observer.observe(element);

    const fetchSpecialists = async () => {
      try {
        const { data, error } = await preregSupabase
          .from("specialist_registrations")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(3);

        if (error) {
          setLoadError(error.message);
          console.error("Error fetching specialists:", error);
          setSpecialists([]);
          return;
        }

        setLoadError(null);
        setSpecialists((data ?? []) as Specialist[]);
      } catch (error) {
        console.error("Error fetching specialists:", error);
        setLoadError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpecialists();

    return () => observer.disconnect();
  }, []);

  return (
    <section id="testimonials-section" className="py-16 sm:py-20 lg:py-24 bg-muted/30 px-4 sm:px-6">
      <div className="container mx-auto max-w-7xl">
        <div
          className={`mx-auto max-w-3xl text-center mb-16 transition-all duration-1000 ${
            isVisible ? "animate-slide-in-up" : "opacity-0"
          }`}
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">Specialists Who have already joined</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Join a community of practitioners who are making a real difference in workplace wellness.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array(3)
              .fill(0)
              .map((_, index) => (
                <Card
                  key={index}
                  className="border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 bg-card"
                >
                  <CardContent className="p-8">
                    <div className="animate-pulse">
                      <div className="flex flex-col items-center mb-6">
                        <div className="w-24 h-24 rounded-full bg-muted/50 mb-4"></div>
                        <div className="h-5 w-32 bg-muted/50 rounded mb-2"></div>
                        <div className="h-4 w-24 bg-muted/50 rounded"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted/50 rounded w-full"></div>
                        <div className="h-3 bg-muted/50 rounded w-5/6"></div>
                        <div className="h-3 bg-muted/50 rounded w-2/3"></div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <div className="h-6 w-16 bg-muted/50 rounded-full"></div>
                        <div className="h-6 w-20 bg-muted/50 rounded-full"></div>
                      </div>
                      <div className="mt-4 h-6 w-32 bg-muted/50 rounded-full mx-auto"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
          ) : loadError ? (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              Unable to load specialists. {loadError}
            </div>
          ) : specialists.length > 0 ? (
            specialists.map((specialist, index) => (
              <Card
                key={specialist.id}
                className={`border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 bg-card ${
                  isVisible ? "animate-slide-in-up" : "opacity-0"
                }`}
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <CardContent className="p-8">
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative w-24 h-24 mb-4">
                      {specialist.profile_photo_url ? (
                        <img
                          src={specialist.profile_photo_url}
                          alt={specialist.full_name}
                          className="w-full h-full rounded-full object-cover border-4 border-primary/10"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground">
                          {specialist.full_name?.charAt(0) ?? "S"}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-foreground">{specialist.full_name}</h3>
                      <p className="text-primary font-medium">{specialist.specialty}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(() => {
                      const langs = parseLanguages(specialist.languages);
                      if (langs.length === 0) return null;
                      return (
                        <div className="flex flex-wrap justify-center gap-2">
                          {langs.map((lang, i) => (
                            <span
                              key={i}
                              className="text-xs bg-gray-500 text-secondary-foreground px-3 py-1 rounded-full font-medium"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      );
                    })()}

                    {specialist.time_zone && (
                      <div className="text-center">
                        <div className="inline-flex items-center text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                          <span className="truncate">{specialist.time_zone.split("(")[0].trim()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              No specialists found. Be the first to join our community!
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <Button asChild variant="outline" className="group">
            <Link to="/specialists" className="inline-flex items-center px-6 py-2">
              View All Specialists
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

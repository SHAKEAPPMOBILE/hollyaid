import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { preregSupabase } from "@/components/preregistration/supabase";
import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface Specialist {
  id: string;
  full_name: string;
  specialty: string;
  avatar_url: string | null;
  bio: string | null;
}

export function TestimonialsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

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
        const { data: publicData, error: publicError } = await supabase
          .from("specialists_public")
          .select("id, full_name, specialty, avatar_url, bio, is_active")
          .not("full_name", "is", null)
          .order("is_active", { ascending: false })
          .order("full_name", { ascending: true });

        const publicSpecialists = (publicData ?? [])
          .filter(
            (specialist): specialist is {
              id: string;
              full_name: string;
              specialty: string;
              avatar_url: string | null;
              bio: string | null;
            } => Boolean(specialist.id && specialist.full_name && specialist.specialty),
          )
          .map((specialist) => ({
            id: specialist.id,
            full_name: specialist.full_name,
            specialty: specialist.specialty,
            avatar_url: specialist.avatar_url,
            bio: specialist.bio,
          }));

        if (publicSpecialists.length > 0) {
          setLoadError(null);
          setSpecialists(publicSpecialists);
          return;
        }

        const { data: preregData, error: preregError } = await preregSupabase
          .from("specialist_registrations")
          .select("id, full_name, specialty, profile_photo_url, bio")
          .order("created_at", { ascending: false });

        const preregSpecialists = (preregData ?? [])
          .filter(
            (specialist): specialist is {
              id: string;
              full_name: string;
              specialty: string;
              profile_photo_url: string | null;
              bio: string | null;
            } => Boolean(specialist.id && specialist.full_name && specialist.specialty),
          )
          .map((specialist) => ({
            id: specialist.id,
            full_name: specialist.full_name,
            specialty: specialist.specialty,
            avatar_url: specialist.profile_photo_url,
            bio: specialist.bio,
          }));

        if (preregSpecialists.length > 0) {
          setLoadError(null);
          setSpecialists(preregSpecialists);
          return;
        }

        if (publicError && preregError) {
          console.error("Error fetching specialists from both sources:", { publicError, preregError });
          setLoadError("Unable to load specialists right now.");
        } else {
          setLoadError(null);
        }
        setSpecialists([]);
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

  useEffect(() => {
    if (!carouselApi || specialists.length < 2) return;

    const autoplayId = window.setInterval(() => {
      if (isCarouselPaused || document.hidden) return;
      carouselApi.scrollNext();
    }, 3200);

    return () => window.clearInterval(autoplayId);
  }, [carouselApi, isCarouselPaused, specialists.length]);

  return (
    <section id="testimonials-section" className="py-16 sm:py-20 lg:py-24 bg-muted/30 px-4 sm:px-6">
      <div className="container mx-auto max-w-7xl">
        <div
          className={`mx-auto max-w-3xl text-center mb-16 transition-all duration-1000 ${
            isVisible ? "animate-slide-in-up" : "opacity-0"
          }`}
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">Meet Our Wellness Specialists</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Browse specialists on Hollyaid. The carousel auto-scrolls so visitors can quickly discover your team.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array(4)
              .fill(0)
              .map((_, index) => (
                <Card key={index} className="border-border rounded-2xl overflow-hidden bg-card">
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="w-20 h-20 rounded-full bg-muted/50 mx-auto mb-4"></div>
                      <div className="h-5 w-32 bg-muted/50 rounded mb-2 mx-auto"></div>
                      <div className="h-4 w-24 bg-muted/50 rounded mx-auto"></div>
                      <div className="mt-4 h-3 bg-muted/50 rounded w-full"></div>
                      <div className="mt-2 h-3 bg-muted/50 rounded w-5/6 mx-auto"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-12 text-muted-foreground">Unable to load specialists. {loadError}</div>
        ) : specialists.length > 0 ? (
          <div className="relative">
            <Carousel
              setApi={setCarouselApi}
              opts={{ align: "start", loop: specialists.length > 1 }}
              className="w-full"
              onMouseEnter={() => setIsCarouselPaused(true)}
              onMouseLeave={() => setIsCarouselPaused(false)}
            >
              <CarouselContent>
                {specialists.map((specialist, index) => (
                  <CarouselItem
                    key={specialist.id}
                    className={`sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 ${
                      isVisible ? "animate-slide-in-up" : "opacity-0"
                    }`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <Card className="border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 bg-card h-full">
                      <CardHeader className="pb-2">
                        <div className="flex flex-col items-center text-center">
                          <div className="relative w-20 h-20 mb-4">
                            {specialist.avatar_url ? (
                              <img
                                src={specialist.avatar_url}
                                alt={specialist.full_name}
                                className="w-full h-full rounded-full object-cover border-4 border-primary/10"
                              />
                            ) : (
                              <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                                {specialist.full_name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-foreground">{specialist.full_name}</h3>
                          <p className="text-primary font-medium">{specialist.specialty}</p>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-6">
                        {specialist.bio ? (
                          <p className="text-sm text-muted-foreground text-center leading-relaxed line-clamp-3">
                            {specialist.bio}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center leading-relaxed">
                            Dedicated to helping teams thrive through accessible workplace wellness support.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {specialists.length > 1 && (
                <>
                  <CarouselPrevious className="left-2 hidden sm:flex bg-background/90 backdrop-blur-sm" />
                  <CarouselNext className="right-2 hidden sm:flex bg-background/90 backdrop-blur-sm" />
                </>
              )}
            </Carousel>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Auto-scrolling carousel ({specialists.length} specialists). Hover to pause.
            </p>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No specialists found yet. Add specialist profiles to populate this section.
          </div>
        )}

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

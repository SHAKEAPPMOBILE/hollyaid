import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { specialistsCarouselFallback, type SpecialistCarouselItem } from "@/data/specialistsCarouselFallback";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export function TestimonialsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [specialists, setSpecialists] = useState<SpecialistCarouselItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        const { data, error } = await supabase
          .from("specialists_public")
          .select("id, full_name, avatar_url, is_active")
          .not("full_name", "is", null)
          .not("avatar_url", "is", null)
          .order("is_active", { ascending: false })
          .order("full_name", { ascending: true });

        if (error) {
          console.error("Error fetching specialists:", error);
          setSpecialists(specialistsCarouselFallback);
          return;
        }

        const normalizedSpecialists = (data ?? [])
          .filter(
            (specialist): specialist is SpecialistCarouselItem =>
              Boolean(
                specialist.id &&
                  specialist.full_name &&
                  typeof specialist.avatar_url === "string" &&
                  specialist.avatar_url.trim().length > 0,
              ),
          )
          .map((specialist) => ({
            id: specialist.id,
            full_name: specialist.full_name,
            avatar_url: specialist.avatar_url,
          }));

        setSpecialists(normalizedSpecialists.length > 0 ? normalizedSpecialists : specialistsCarouselFallback);
      } catch (error) {
        console.error("Error fetching specialists:", error);
        setSpecialists(specialistsCarouselFallback);
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
    <section id="testimonials-section" className="py-10 sm:py-12 lg:py-14 bg-muted/30 px-4 sm:px-6">
      <div className="container mx-auto max-w-7xl">
        <div
          className={`mx-auto max-w-3xl text-center mb-4 transition-all duration-1000 ${
            isVisible ? "animate-slide-in-up" : "opacity-0"
          }`}
        >
          <p className="text-lg text-muted-foreground leading-relaxed">
            We have a community of practitioners who are already making a real difference in workplace wellness.
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
                    className={`sm:basis-1/2 lg:basis-1/3 xl:basis-1/5 ${
                      isVisible ? "animate-slide-in-up" : "opacity-0"
                    }`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <Card className="border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 bg-card h-full">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="relative w-24 h-24 mb-4">
                            <img
                              src={specialist.avatar_url}
                              alt={specialist.full_name}
                              className="w-full h-full rounded-full object-cover border-4 border-primary/10"
                            />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground leading-tight">{specialist.full_name}</h3>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        ) : (
          <div className="h-24" />
        )}
      </div>
    </section>
  );
}

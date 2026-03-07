import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const OFFLINE_ACTIVITIES = [
  "Ice Bath",
  "Yoga",
  "Meditation",
  "Breathwork",
  "Sound Healing",
  "Energy Healing",
  "Stretching",
  "Mobility Training",
  "Pilates",
  "Dance Therapy",
  "Massage Therapy",
  "Myofascial Release",
  "Wellness Hiking",
  "Forest Bathing",
  "Healthy Cooking",
  "Sleep Optimization",
  "Stress Management",
  "Burnout Recovery",
  "Group Therapy",
  "Productivity Training",
];

export function OfflineActivitiesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  const carouselItems = useMemo(() => {
    const minSeamlessItems = 12;
    const repetitionCount = Math.max(2, Math.ceil(minSeamlessItems / OFFLINE_ACTIVITIES.length));
    const repeated: string[] = [];
    for (let i = 0; i < repetitionCount; i += 1) {
      repeated.push(...OFFLINE_ACTIVITIES);
    }
    return repeated;
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("offline-activities-section");
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!carouselApi || carouselItems.length < 2) return;

    const autoplayId = window.setInterval(() => {
      if (document.hidden) return;
      carouselApi.scrollNext();
    }, 2200);

    return () => window.clearInterval(autoplayId);
  }, [carouselApi, carouselItems.length]);

  return (
    <section
      id="offline-activities-section"
      className="py-10 sm:py-12 lg:py-14 bg-muted/30 px-4 sm:px-6 border-t border-border"
    >
      <div className="container mx-auto max-w-7xl">
        <div
          className={`mx-auto max-w-3xl text-center mb-8 transition-all duration-1000 ${
            isVisible ? "animate-slide-in-up" : "opacity-0"
          }`}
        >
          <p className="text-lg text-muted-foreground leading-relaxed">
            We also offer off-line wellness activities like:
          </p>
        </div>

        <div className="relative">
          <Carousel
            setApi={setCarouselApi}
            opts={{
              align: "start",
              loop: carouselItems.length > 1,
              containScroll: "keepSnaps",
            }}
            className="w-full"
          >
            <CarouselContent>
              {carouselItems.map((activity, index) => (
                <CarouselItem
                  key={`${activity}-${index}`}
                  className={`sm:basis-1/2 lg:basis-1/3 xl:basis-1/5 ${
                    isVisible ? "animate-slide-in-up" : "opacity-0"
                  }`}
                >
                  <Card className="border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 bg-card h-full">
                    <CardContent className="p-5 flex items-center justify-center min-h-[80px]">
                      <span className="text-base font-medium text-foreground text-center leading-tight">
                        {activity}
                      </span>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
}

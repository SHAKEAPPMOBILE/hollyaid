import { useState } from "react";
import { Play } from "lucide-react";

const YOUTUBE_ID = import.meta.env.VITE_DEMO_VIDEO_YOUTUBE_ID as string | undefined;
/** URL for a dashboard demo video. If unset, shows Book a demo CTA. */
const DEMO_VIDEO_SRC = import.meta.env.VITE_DEMO_VIDEO_URL as string | undefined;

const BOOK_DEMO_MAILTO =
  "mailto:info@hollyaid.com?subject=Hollyaid%20product%20demo%20request&body=Hi%20Hollyaid%20team%2C%0D%0A%0D%0AI%27d%20love%20to%20book%20a%20demo%20of%20the%20platform.%20Here%20are%20a%20few%20times%20that%20work%20for%20me%3A%0D%0A%0D%0A-%20%5Badd%20option%201%5D%0D%0A-%20%5Badd%20option%202%5D%0D%0A%0D%0ACompany%20name%3A%20%5Byour%20company%5D%0D%0ACompany%20size%3A%20%5Bestimate%5D%0D%0A%0D%0AThank%20you!";

export function ProductDemoSection() {
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const showBookDemo = !YOUTUBE_ID && !DEMO_VIDEO_SRC;

  return (
    <section
      id="product-demo"
      className="py-10 sm:py-12 lg:py-14 bg-background px-4 sm:px-6 border-t border-border"
    >
      <div className="container mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            See Hollyaid in action
          </h2>
          <p className="text-muted-foreground">
            A quick walkthrough of how employees and companies use the platform.
          </p>
        </div>

        <div className="relative w-full rounded-2xl overflow-hidden border border-border bg-muted/30 shadow-lg aspect-video max-h-[500px]">
          {YOUTUBE_ID ? (
            <iframe
              title="Hollyaid product demo"
              src={`https://www.youtube.com/embed/${YOUTUBE_ID}?rel=0`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : showBookDemo ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-muted/30">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Play className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                Want a guided tour of Hollyaid for your team?
              </p>
              <a
                href={BOOK_DEMO_MAILTO}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:bg-primary/90 transition-colors"
              >
                Book a demo
              </a>
            </div>
          ) : (
            <>
              <video
                className={`absolute inset-0 w-full h-full object-cover ${videoError ? "hidden" : ""}`}
                src={DEMO_VIDEO_SRC}
                autoPlay
                muted
                loop
                playsInline
                title="Hollyaid dashboard demo"
                onCanPlay={() => setVideoReady(true)}
                onError={() => setVideoError(true)}
              />
              {(!videoReady || videoError) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-muted/30" aria-hidden>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Play className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Want a guided tour of Hollyaid for your team?
                  </p>
                  <a
                    href="mailto:info@hollyaid.com?subject=Hollyaid%20product%20demo%20request&body=Hi%20Hollyaid%20team%2C%0D%0A%0D%0AI%27d%20love%20to%20book%20a%20demo%20of%20the%20platform.%20Here%20are%20a%20few%20times%20that%20work%20for%20me%3A%0D%0A%0D%0A-%20%5Badd%20option%201%5D%0D%0A-%20%5Badd%20option%202%5D%0D%0A%0D%0ACompany%20name%3A%20%5Byour%20company%5D%0D%0ACompany%20size%3A%20%5Bestimate%5D%0D%0A%0D%0AThank%20you!"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:bg-primary/90 transition-colors"
                  >
                    Book a demo
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

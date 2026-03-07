import { useState } from "react";
import { Play } from "lucide-react";

const YOUTUBE_ID = import.meta.env.VITE_DEMO_VIDEO_YOUTUBE_ID as string | undefined;
/** URL for a short (e.g. 7s) dashboard demo video. If unset, uses /demo-dashboard.mp4 from public. */
const DEMO_VIDEO_SRC = (import.meta.env.VITE_DEMO_VIDEO_URL as string) || "/demo-dashboard.mp4";

export function ProductDemoSection() {
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);

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
                    Add a 7-second dashboard video as <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">public/demo-dashboard.mp4</code> or set <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">VITE_DEMO_VIDEO_URL</code>.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const BOOK_DEMO_MAILTO =
  "mailto:info@hollyaid.com?subject=Hollyaid%20product%20demo%20request&body=Hi%20Hollyaid%20team%2C%0D%0A%0D%0AI%27d%20love%20to%20book%20a%20demo%20of%20the%20platform.%20Here%20are%20a%20few%20times%20that%20work%20for%20me%3A%0D%0A%0D%0A-%20%5Badd%20option%201%5D%0D%0A-%20%5Badd%20option%202%5D%0D%0A%0D%0ACompany%20name%3A%20%5Byour%20company%5D%0D%0ACompany%20size%3A%20%5Bestimate%5D%0D%0A%0D%0AThank%20you!";

export function ProductDemoSection() {

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
        </div>

        <div className="w-full flex flex-col items-center justify-center gap-4 text-center">
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
      </div>
    </section>
  );
}

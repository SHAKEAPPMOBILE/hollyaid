import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

const Terms = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Use</h1>
          <p className="text-muted-foreground">Last updated: September 16, 2025</p>
        </div>

        <div className="prose prose-slate dark:prose-invert prose-lg max-w-none">
          <section className="mb-12">
            <p className="text-muted-foreground leading-relaxed">
              These Terms govern your use of the Hollyaid website and services. By accessing or using our site, you
              agree to be bound by these Terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-foreground border-b pb-2">1. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be 18 years or older (or the age of majority in your jurisdiction) to use our services.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-foreground border-b pb-2">2. Use of the Service</h2>
            <ul className="space-y-3 mb-6 pl-6 list-disc">
              <li className="text-muted-foreground">Do not use the service for unlawful or prohibited purposes.</li>
              <li className="text-muted-foreground">Do not impersonate others or misrepresent your affiliation.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-foreground border-b pb-2">Contact</h2>
            <p className="text-muted-foreground">Questions? Contact us:</p>
            <a
              href="mailto:info@hollyaid.com"
              className="inline-flex items-center gap-2 mt-3 text-primary hover:underline font-medium"
            >
              <Mail className="h-4 w-4" />
              info@hollyaid.com
            </a>
          </section>

          <div className="mt-10">
            <Link to="/" className="text-primary underline hover:text-primary/90">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Terms;

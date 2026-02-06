import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

const Privacy = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: September 16, 2025</p>
        </div>

        <div className="prose prose-slate dark:prose-invert prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Hollyaid ("we", "us", "our"). We are committed to protecting and respecting your privacy.
              This policy explains how we collect, use, disclose, and safeguard personal data when you visit our site
              or pre-register as a specialist.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-foreground border-b pb-2">1. Data We Collect</h2>
            <ul className="space-y-3 mb-6 pl-6 list-disc">
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Identity information:</span> name, specialty, years of
                experience, languages, time zone, etc.
              </li>
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Contact information:</span> email address, phone number.
              </li>
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Professional details:</span> certifications, bio, profile
                photo, website.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-foreground border-b pb-2">2. How We Use Your Data</h2>
            <ul className="space-y-3 mb-6 pl-6 list-disc">
              <li className="text-muted-foreground">Processing your pre-registration and onboarding.</li>
              <li className="text-muted-foreground">Communicating with you for updates and support.</li>
              <li className="text-muted-foreground">Improving our services and offerings.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-foreground border-b pb-2">Contact</h2>
            <p className="text-muted-foreground">If you have questions about this policy, contact us:</p>
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

export default Privacy;

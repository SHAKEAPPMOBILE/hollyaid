import { Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 p-1 items-center justify-center rounded-full bg-primary-foreground">
              <img src="/logo-hollyaid.png" alt="logo" />
            </div>
            <h3 className="text-lg font-bold">Hollyaid</h3>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/80">
            <a href="/privacy" className="hover:text-primary-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-primary-foreground transition-colors">
              Terms of Use
            </a>
            <div className="flex flex-col items-center">
              <p className="text-xs text-primary-foreground/60 mb-1">Questions? We're here to help!</p>
              <a
                href="mailto:info@hollyaid.com"
                className="flex items-center gap-1 hover:text-primary-foreground transition-colors font-medium"
              >
                <Mail className="h-4 w-4" />
                info@hollyaid.com
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-primary-foreground/10 text-center text-sm text-primary-foreground/60">
          &copy; {new Date().getFullYear()} Hollyaid. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

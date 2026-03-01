import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyAdminAccess } from "@/lib/companyAdminAccess";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import SpecialistSignup from "./pages/SpecialistSignup";
import SpecialistDashboard from "./pages/SpecialistDashboard";
import EmployeeSignup from "./pages/EmployeeSignup";
import PaymentSuccess from "./pages/PaymentSuccess";
import CompleteProfile from "./pages/CompleteProfile";
import Settings from "./pages/Settings";
import CompanyBilling from "./pages/CompanyBilling";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Specialists from "./pages/Specialists";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Detects Supabase auth callback params/fragments (e.g. access_token, token_hash, code)
 * and redirects to /auth/callback while preserving them for session exchange.
 */
const AuthHashRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    const search = location.search;
    const searchParams = new URLSearchParams(search);
    const hasAuthHash = hash.includes("access_token") || hash.includes("refresh_token");
    const hasAuthQuery = searchParams.has("code") || searchParams.has("token_hash");

    if (
      (hasAuthHash || hasAuthQuery) &&
      location.pathname !== "/auth/callback"
    ) {
      navigate(`/auth/callback${search}${hash}`, { replace: true });
      return;
    }

    if (location.pathname !== "/") return;

    let mounted = true;

    const redirectAuthenticatedUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted || !session?.user) return;

      const userId = session.user.id;

      const { data: specialist } = await supabase
        .from("specialists")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (specialist) {
        navigate("/specialist-dashboard", { replace: true });
        return;
      }

      const { company, isCompanyAdmin } = await getCompanyAdminAccess(userId, session.user.email);
      if (isCompanyAdmin) {
        if (company?.subscription_status === "unpaid") {
          navigate("/auth", { replace: true });
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("job_title")
          .eq("user_id", userId)
          .maybeSingle();

        navigate(profile?.job_title ? "/dashboard" : "/complete-profile", { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("job_title")
        .eq("user_id", userId)
        .maybeSingle();

      navigate(profile?.job_title ? "/dashboard" : "/complete-profile", { replace: true });
    };

    void redirectAuthenticatedUser();

    return () => {
      mounted = false;
    };
  }, [navigate, location.hash, location.pathname, location.search]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthHashRedirect />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/specialists" element={<Specialists />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/specialist-signup" element={<SpecialistSignup />} />
            <Route path="/specialist-dashboard" element={<SpecialistDashboard />} />
            <Route path="/employee-signup" element={<EmployeeSignup />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/company-billing" element={<CompanyBilling />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
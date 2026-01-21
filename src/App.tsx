import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
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
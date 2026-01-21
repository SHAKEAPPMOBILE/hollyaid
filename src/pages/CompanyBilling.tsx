import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import MinutesUsageTracker from "@/components/MinutesUsageTracker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Clock, ReceiptText } from "lucide-react";

interface Company {
  plan_type: string | null;
  minutes_included: number | null;
  minutes_used: number | null;
  subscription_period_end: string | null;
}

const CompanyBilling: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      void fetchCompany();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const fetchCompany = async () => {
    if (!user) return;

    try {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "company_admin")
        .single();

      const admin = !!roleRow;
      setIsCompanyAdmin(admin);

      if (!admin) {
        navigate("/dashboard");
        return;
      }

      const { data: companyData, error } = await supabase
        .from("companies")
        .select("plan_type, minutes_included, minutes_used, subscription_period_end")
        .eq("admin_user_id", user.id)
        .single();

      if (error) throw error;
      setCompany((companyData as Company) ?? null);
    } catch (e) {
      console.error("Error loading company billing:", e);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const included = company?.minutes_included ?? 0;
    const used = company?.minutes_used ?? 0;
    const remaining = Math.max(0, included - used);
    const percent = included > 0 ? Math.round((used / included) * 100) : 0;

    const renewalText = company?.subscription_period_end
      ? new Date(company.subscription_period_end).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "-";

    return { included, used, remaining, percent, renewalText };
  }, [company]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary">Loading...</div>
      </div>
    );
  }

  if (!isCompanyAdmin || !company) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center relative">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="absolute left-4">
            <ArrowLeft size={16} />
            Back
          </Button>
          <div className="flex-1 flex justify-center">
            <Logo size="sm" />
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Company Billing</h1>
          <p className="text-muted-foreground mt-1">Plan, renewal date, and minutes usage.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText size={20} />
              Summary
            </CardTitle>
            <CardDescription>Quick overview of your current billing cycle.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="text-lg font-semibold text-foreground">
                    {(company.plan_type || "starter").toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <div className="p-2 rounded-lg bg-secondary">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Renewal date</p>
                  <p className="text-lg font-semibold text-foreground">{summary.renewalText}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ReceiptText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Minutes used</p>
                  <p className="text-lg font-semibold text-foreground">
                    {summary.used.toLocaleString()} / {summary.included.toLocaleString()} ({summary.percent}%)
                  </p>
                  <p className="text-sm text-muted-foreground">{summary.remaining.toLocaleString()} remaining</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <MinutesUsageTracker company={company} />
      </main>
    </div>
  );
};

export default CompanyBilling;

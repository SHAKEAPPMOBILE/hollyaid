import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyAdminAccess } from "@/lib/companyAdminAccess";
import Logo from "@/components/Logo";
import MinutesUsageTracker from "@/components/MinutesUsageTracker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Clock, ReceiptText } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import LanguagePicker from "@/components/LanguagePicker";

interface Company {
  plan_type: string | null;
  minutes_included: number | null;
  minutes_used: number | null;
  subscription_period_end: string | null;
}

type WeeklyUsagePoint = {
  weekLabel: string;
  minutes: number;
};

const CompanyBilling: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);

  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weekly, setWeekly] = useState<WeeklyUsagePoint[]>([]);

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
      const { company: adminCompany, isCompanyAdmin, error: companyAccessError } = await getCompanyAdminAccess(user.id, user.email);

      if (companyAccessError) {
        throw new Error(companyAccessError);
      }

      if (!isCompanyAdmin || !adminCompany?.id) {
        navigate("/dashboard");
        return;
      }

      const { data: companyData, error: companyDataError } = await supabase
        .from("companies")
        .select("plan_type, minutes_included, minutes_used, subscription_period_end")
        .eq("id", adminCompany.id)
        .maybeSingle();

      if (companyDataError) throw companyDataError;

      setIsCompanyAdmin(!!companyData);
      setCompany((companyData as Company | null) ?? null);
    } catch (e) {
      console.error("Error loading company billing:", e);
      setIsCompanyAdmin(false);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyBreakdown = async () => {
    setWeeklyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("company-minutes-breakdown");
      if (error) throw error;

      const weeks = (data?.weeks ?? []) as Array<{ week_start: string; minutes_used: number }>;
      const points: WeeklyUsagePoint[] = weeks.map((w) => {
        const start = new Date(w.week_start);
        const label = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        return { weekLabel: label, minutes: Number(w.minutes_used ?? 0) };
      });
      setWeekly(points);
    } catch (e) {
      console.error("Error loading weekly breakdown:", e);
      setWeekly([]);
    } finally {
      setWeeklyLoading(false);
    }
  };

  useEffect(() => {
    if (isCompanyAdmin && company) {
      void fetchWeeklyBreakdown();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompanyAdmin, !!company]);

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

  const chartConfig: ChartConfig = {
    minutes: {
      label: "Minutes used",
      theme: {
        light: "hsl(var(--primary))",
        dark: "hsl(var(--primary))",
      },
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center relative">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="absolute left-4">
            <ArrowLeft size={16} />
            {t("common.back")}
          </Button>
          <div className="absolute right-4">
            <LanguagePicker />
          </div>
          <div className="flex-1 flex justify-center">
            <Logo size="sm" />
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t("billing.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("billing.subtitle")}</p>
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Monthly minutes breakdown</CardTitle>
            <CardDescription>Weekly minutes used over the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyLoading ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground">Loading chart…</div>
            ) : weekly.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground">No usage yet.</div>
            ) : (
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <BarChart data={weekly} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="weekLabel" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="minutes" fill="var(--color-minutes)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <MinutesUsageTracker company={company} />
      </main>
    </div>
  );
};

export default CompanyBilling;

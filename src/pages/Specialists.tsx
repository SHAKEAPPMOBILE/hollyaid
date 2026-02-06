import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { preregSupabase } from "@/components/preregistration/supabase";

type Specialist = {
  id: string;
  full_name: string;
  specialty: string;
  profile_photo_url: string | null;
  languages: unknown;
  skills: unknown;
};

function safeParseStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string") as string[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === "string") as string[];
      return [value];
    } catch {
      return value.split(",").map((v) => v.trim()).filter(Boolean);
    }
  }
  return [];
}

const PAGE_SIZE = 9;

const Specialists = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      setLoadError(null);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await preregSupabase
        .from("specialist_registrations")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error(error);
        setLoadError(error.message);
        setSpecialists([]);
        setTotalCount(0);
      } else {
        setSpecialists((data ?? []) as Specialist[]);
        setTotalCount(count ?? 0);
      }

      setLoading(false);
    };

    fetchPage();
  }, [page]);

  const gotoPage = (next: number) => {
    setSearchParams({ page: String(next) });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">Our Specialists</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Meet our team of dedicated wellness professionals committed to your health journey.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Loading...</div>
        ) : loadError ? (
          <div className="text-center text-muted-foreground">Unable to load specialists. {loadError}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {specialists.map((specialist) => {
              const skills = safeParseStringArray(specialist.skills);
              const languages = safeParseStringArray(specialist.languages);

              return (
                <div
                  key={specialist.id}
                  className="border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 bg-card"
                >
                  <div className="p-8">
                    <div className="flex flex-col items-center mb-6">
                      <div className="relative w-32 h-32 mb-4">
                        {specialist.profile_photo_url ? (
                          <img
                            src={specialist.profile_photo_url}
                            alt={specialist.full_name}
                            className="w-full h-full rounded-full object-cover border-4 border-primary/10"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-4xl font-bold text-muted-foreground">
                            {specialist.full_name?.charAt(0) ?? "S"}
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-foreground">{specialist.full_name}</h3>
                        <p className="text-primary font-medium">{specialist.specialty}</p>
                      </div>
                    </div>

                    {skills.length > 0 && (
                      <div className="mb-5">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {skills.slice(0, 10).map((skill, i) => (
                            <span
                              key={i}
                              className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {languages.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2 text-center">Languages</h4>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {languages.slice(0, 10).map((lang, i) => (
                            <span
                              key={i}
                              className="text-xs bg-gray-500 text-secondary-foreground px-3 py-1 rounded-full font-medium"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => gotoPage(page - 1)}>
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => gotoPage(page + 1)}>
            Next
          </Button>
        </div>

        <div className="mt-10 text-center">
          <Link to="/" className="text-primary underline hover:text-primary/90">
            Return to Home
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Specialists;

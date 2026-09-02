import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { generateRoadmap } from "@/lib/roadmap.functions";
import {
  fetchAllSteps,
  fetchIntegrations,
  fetchRoadmaps,
  percent,
  PROVIDERS,
} from "@/lib/roadmap-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShirtGPT — AI Roadmaps for Any Goal" },
      {
        name: "description",
        content:
          "ShirtGPT turns any goal into a step-by-step roadmap, tracks your milestones on a live dashboard, and syncs with Notion, Trello and Google Calendar.",
      },
      { property: "og:title", content: "ShirtGPT — AI Roadmaps for Any Goal" },
      {
        property: "og:description",
        content:
          "Describe a goal, get an ordered roadmap, track every milestone, and sync it to the tools you already use.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const TIMEFRAMES = ["4 weeks", "12 weeks", "6 months"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

function Dashboard() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const queryClient = useQueryClient();
  const generate = useServerFn(generateRoadmap);

  const [goal, setGoal] = useState("");
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[1]!);
  const [level, setLevel] = useState(LEVELS[0]!);

  useEffect(() => {
    if (!loading && !session) router.navigate({ to: "/auth" });
  }, [loading, session, router]);

  const roadmapsQuery = useQuery({
    queryKey: ["roadmaps"],
    queryFn: fetchRoadmaps,
    enabled: !!session,
  });
  const stepsQuery = useQuery({
    queryKey: ["steps"],
    queryFn: fetchAllSteps,
    enabled: !!session,
  });
  const integrationsQuery = useQuery({
    queryKey: ["integrations"],
    queryFn: fetchIntegrations,
    enabled: !!session,
  });

  const mutation = useMutation({
    mutationFn: () => generate({ data: { goal, timeframe, level } }),
    onSuccess: async (result) => {
      setGoal("");
      await queryClient.invalidateQueries();
      toast.success("Roadmap ready");
      router.navigate({ to: "/roadmap/$id", params: { id: result.id } });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not generate roadmap"),
  });

  const roadmaps = roadmapsQuery.data ?? [];
  const steps = stepsQuery.data ?? [];
  const active = roadmaps[0];
  const activeSteps = active ? steps.filter((s) => s.roadmap_id === active.id) : [];
  const progress = percent(activeSteps);
  const connected = integrationsQuery.data ?? [];

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="panel p-6 lg:col-span-7">
          {active ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] tracking-[0.2em] text-accent/80 uppercase">
                    Active roadmap
                  </p>
                  <h1 className="mt-2 text-3xl font-bold">{active.title}</h1>
                </div>
                <span className="rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary">
                  {progress === 100 ? "Complete" : "On track"}
                </span>
              </div>

              <div className="mt-6">
                <div className="flex items-end justify-between">
                  <p className="text-5xl font-bold">
                    {progress}
                    <span className="text-2xl text-muted-foreground">%</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeSteps.filter((s) => s.done).length} of {activeSteps.length} steps ·{" "}
                    {active.timeframe}
                  </p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="bg-brand-gradient glow-accent h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-display text-sm font-medium text-muted-foreground">
                    Your roadmaps
                  </p>
                  <Link to="/progress" className="text-xs text-accent hover:underline">
                    View progress
                  </Link>
                </div>
                <div className="space-y-3">
                  {roadmaps.map((roadmap, index) => {
                    const own = steps.filter((s) => s.roadmap_id === roadmap.id);
                    const pct = percent(own);
                    return (
                      <Link
                        key={roadmap.id}
                        to="/roadmap/$id"
                        params={{ id: roadmap.id }}
                        className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                          index === 0
                            ? "glow-brand border-primary/40 bg-primary/10"
                            : "border-border bg-foreground/[0.03] hover:bg-foreground/[0.06]"
                        }`}
                      >
                        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{roadmap.title}</p>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                            <div
                              className="bg-brand-gradient h-full rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="py-10 text-center">
              <p className="text-[11px] tracking-[0.2em] text-accent/80 uppercase">
                No roadmap yet
              </p>
              <h1 className="mt-3 text-3xl font-bold">Name a goal, get the whole route</h1>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                Learning Python, launching a business, training for a race — describe it on the
                right and ShirtGPT lays out every milestone and step.
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-6 lg:col-span-5">
          <section className="panel p-6">
            <p className="font-display text-sm font-medium text-muted-foreground">
              Generate a roadmap
            </p>
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-background/50 p-3">
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                placeholder="teach me to build a SaaS startup solo"
                className="resize-none bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              <div className="flex flex-wrap gap-2">
                {TIMEFRAMES.map((option) => (
                  <button
                    key={option}
                    onClick={() => setTimeframe(option)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] transition-colors ${
                      timeframe === option
                        ? "bg-accent/20 text-accent"
                        : "bg-foreground/5 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {LEVELS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setLevel(option)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] transition-colors ${
                      level === option
                        ? "bg-primary/25 text-foreground"
                        : "bg-foreground/5 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option}
                  </button>
                ))}
                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending || goal.trim().length < 3}
                  className="bg-brand-gradient glow-brand ml-auto rounded-lg px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {mutation.isPending ? "Building…" : "Generate"}
                </button>
              </div>
            </div>
          </section>

          <section className="panel p-6">
            <p className="font-display text-sm font-medium text-muted-foreground">Synced tools</p>
            <div className="mt-4 space-y-2.5">
              {PROVIDERS.map((provider) => {
                const link = connected.find((item) => item.provider === provider.key);
                return (
                  <div
                    key={provider.key}
                    className={`flex items-center gap-3 rounded-2xl border p-3 ${
                      link
                        ? "border-border bg-foreground/[0.03]"
                        : "border-dashed border-border bg-foreground/[0.02]"
                    }`}
                  >
                    <div className="grid size-9 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                      {provider.short}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{provider.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {link?.detail ?? provider.blurb}
                      </p>
                    </div>
                    {link ? (
                      <span className="flex items-center gap-1.5 text-xs text-success">
                        <span className="size-1.5 rounded-full bg-success" />
                        Connected
                      </span>
                    ) : (
                      <Link
                        to="/integrations"
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Connect
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

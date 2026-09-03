import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllSteps, fetchRoadmaps, percent } from "@/lib/roadmap-data";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress & Achievements — ShirtGPT" },
      {
        name: "description",
        content:
          "See completion across every ShirtGPT roadmap, track finished steps, and unlock achievements as you push your goals forward.",
      },
      { property: "og:title", content: "Progress & Achievements — ShirtGPT" },
      {
        property: "og:description",
        content: "One dashboard for completion rates, active roadmaps and unlocked achievements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

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

  const roadmaps = roadmapsQuery.data ?? [];
  const steps = stepsQuery.data ?? [];
  const doneSteps = steps.filter((s) => s.done).length;
  const overall = percent(steps);
  const completedRoadmaps = roadmaps.filter((r) => {
    const own = steps.filter((s) => s.roadmap_id === r.id);
    return own.length > 0 && own.every((s) => s.done);
  }).length;

  const achievements = [
    { name: "First roadmap", unlocked: roadmaps.length >= 1, hint: "Generate a roadmap" },
    { name: "Getting moving", unlocked: doneSteps >= 1, hint: "Complete your first step" },
    { name: "Ten down", unlocked: doneSteps >= 10, hint: "Complete 10 steps" },
    { name: "Halfway hero", unlocked: overall >= 50, hint: "Reach 50% overall" },
    { name: "Finisher", unlocked: completedRoadmaps >= 1, hint: "Finish a whole roadmap" },
    { name: "Multi-tasker", unlocked: roadmaps.length >= 3, hint: "Run 3 roadmaps at once" },
  ];

  const stats = [
    { label: "Overall completion", value: `${overall}%` },
    { label: "Steps completed", value: `${doneSteps}` },
    { label: "Active roadmaps", value: `${roadmaps.length}` },
    { label: "Roadmaps finished", value: `${completedRoadmaps}` },
  ];

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Progress</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every roadmap, milestone and achievement in one view.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="panel p-5">
            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <section className="panel p-6 lg:col-span-7">
          <p className="font-display text-sm font-medium text-muted-foreground">Roadmap progress</p>
          <div className="mt-4 space-y-3">
            {roadmaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing tracked yet —{" "}
                <Link to="/" className="text-accent hover:underline">
                  generate your first roadmap
                </Link>
                .
              </p>
            ) : (
              roadmaps.map((roadmap) => {
                const own = steps.filter((s) => s.roadmap_id === roadmap.id);
                const pct = percent(own);
                return (
                  <Link
                    key={roadmap.id}
                    to="/roadmap/$id"
                    params={{ id: roadmap.id }}
                    className="block rounded-2xl border border-border bg-foreground/[0.03] p-4 transition-colors hover:bg-foreground/[0.06]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="truncate text-sm font-medium">{roadmap.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {own.filter((s) => s.done).length}/{own.length} · {pct}%
                      </span>
                    </div>
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className="bg-brand-gradient h-full rounded-full transition-[width] duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        <section className="panel p-6 lg:col-span-5">
          <p className="font-display text-sm font-medium text-muted-foreground">Achievements</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {achievements.map((badge) => (
              <div
                key={badge.name}
                className={`rounded-2xl border p-4 ${
                  badge.unlocked
                    ? "glow-brand border-primary/40 bg-primary/10"
                    : "border-dashed border-border bg-foreground/[0.02]"
                }`}
              >
                <div
                  className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
                    badge.unlocked
                      ? "bg-brand-gradient text-primary-foreground"
                      : "bg-foreground/10 text-muted-foreground"
                  }`}
                >
                  {badge.unlocked ? "★" : "☆"}
                </div>
                <p className="mt-3 text-sm font-medium">{badge.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{badge.hint}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

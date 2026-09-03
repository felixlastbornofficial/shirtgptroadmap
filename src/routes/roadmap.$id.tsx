import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { fetchRoadmap, percent, toggleStep } from "@/lib/roadmap-data";

export const Route = createFileRoute("/roadmap/$id")({
  head: () => ({
    meta: [
      { title: "Roadmap Detail — ShirtGPT" },
      {
        name: "description",
        content:
          "Work through your ShirtGPT roadmap milestone by milestone and check off each concrete step as you complete it.",
      },
      { property: "og:title", content: "Roadmap Detail — ShirtGPT" },
      {
        property: "og:description",
        content: "Every milestone and step of your goal, with live progress as you check things off.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoadmapDetail,
});

function RoadmapDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { session, loading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !session) router.navigate({ to: "/auth" });
  }, [loading, session, router]);

  const query = useQuery({
    queryKey: ["roadmap", id],
    queryFn: () => fetchRoadmap(id),
    enabled: !!session,
  });

  const mutation = useMutation({
    mutationFn: ({ stepId, done }: { stepId: string; done: boolean }) =>
      toggleStep(stepId, done),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update step"),
  });

  const roadmap = query.data?.roadmap;
  const milestones = query.data?.milestones ?? [];
  const steps = query.data?.steps ?? [];
  const progress = percent(steps);

  return (
    <AppShell>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading roadmap…</p>
      ) : !roadmap ? (
        <div className="panel p-10 text-center">
          <h1 className="text-2xl font-bold">Roadmap not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have been deleted, or it belongs to another account.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm text-accent hover:underline">
            Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="panel h-fit p-6 lg:col-span-4">
            <p className="text-[11px] tracking-[0.2em] text-accent/80 uppercase">Roadmap</p>
            <h1 className="mt-2 text-2xl font-bold">{roadmap.title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{roadmap.summary}</p>

            <div className="mt-6">
              <div className="flex items-end justify-between">
                <p className="text-4xl font-bold">
                  {progress}
                  <span className="text-xl text-muted-foreground">%</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {steps.filter((s) => s.done).length}/{steps.length} steps
                </p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="bg-brand-gradient glow-accent h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <dl className="mt-6 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <dt>Timeframe</dt>
                <dd className="text-foreground">{roadmap.timeframe}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Level</dt>
                <dd className="text-foreground">{roadmap.level}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt>Goal</dt>
                <dd className="text-right text-foreground">{roadmap.goal}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-4 lg:col-span-8">
            {milestones.map((milestone, index) => {
              const own = steps.filter((s) => s.milestone_id === milestone.id);
              const pct = percent(own);
              return (
                <article key={milestone.id} className="panel p-6">
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        pct === 100
                          ? "bg-success/20 text-success"
                          : "bg-primary/20 text-primary"
                      }`}
                    >
                      {pct === 100 ? "✓" : index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-lg font-semibold">{milestone.title}</h2>
                      {milestone.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {milestone.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {own.map((step) => (
                      <li key={step.id}>
                        <button
                          onClick={() => mutation.mutate({ stepId: step.id, done: !step.done })}
                          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-foreground/[0.03] p-3 text-left transition-colors hover:bg-foreground/[0.06]"
                        >
                          <span
                            className={`grid size-5 shrink-0 place-items-center rounded-md border text-[11px] ${
                              step.done
                                ? "border-transparent bg-brand-gradient text-primary-foreground"
                                : "border-border"
                            }`}
                          >
                            {step.done ? "✓" : ""}
                          </span>
                          <span
                            className={`text-sm ${
                              step.done ? "text-muted-foreground line-through" : ""
                            }`}
                          >
                            {step.title}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </section>
        </div>
      )}
    </AppShell>
  );
}

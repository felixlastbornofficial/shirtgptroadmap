import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  connectIntegration,
  disconnectIntegration,
  fetchIntegrations,
  PROVIDERS,
  syncIntegration,
} from "@/lib/roadmap-data";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — ShirtGPT" },
      {
        name: "description",
        content:
          "Connect ShirtGPT to Notion, Trello and Google Calendar so every milestone and step lands in the tools you already work in.",
      },
      { property: "og:title", content: "Integrations — ShirtGPT" },
      {
        property: "og:description",
        content: "Sync your roadmaps with Notion pages, Trello cards and Google Calendar blocks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !session) router.navigate({ to: "/auth" });
  }, [loading, session, router]);

  const query = useQuery({
    queryKey: ["integrations"],
    queryFn: fetchIntegrations,
    enabled: !!session,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["integrations"] });
  const fail = (error: unknown) =>
    toast.error(error instanceof Error ? error.message : "Something went wrong");

  const connect = useMutation({
    mutationFn: ({ key, detail }: { key: string; detail: string }) =>
      connectIntegration(key, detail),
    onSuccess: async () => {
      await invalidate();
      toast.success("Connected");
    },
    onError: fail,
  });

  const disconnect = useMutation({
    mutationFn: (id: string) => disconnectIntegration(id),
    onSuccess: async () => {
      await invalidate();
      toast.success("Disconnected");
    },
    onError: fail,
  });

  const sync = useMutation({
    mutationFn: (id: string) => syncIntegration(id),
    onSuccess: async () => {
      await invalidate();
      toast.success("Synced");
    },
    onError: fail,
  });

  const links = query.data ?? [];
  const busy = connect.isPending || disconnect.isPending || sync.isPending;

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Integrations</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Push your roadmaps into the tools you already use. Connect a workspace and ShirtGPT keeps
        milestones and steps mirrored there.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const link = links.find((item) => item.provider === provider.key);
          return (
            <section
              key={provider.key}
              className={`panel flex flex-col p-6 ${link ? "border-primary/30" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="bg-brand-gradient grid size-11 place-items-center rounded-xl text-sm font-bold text-primary-foreground">
                  {provider.short}
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold">{provider.name}</h2>
                  {link ? (
                    <span className="flex items-center gap-1.5 text-xs text-success">
                      <span className="size-1.5 rounded-full bg-success" />
                      Connected
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not connected</span>
                  )}
                </div>
              </div>

              <p className="mt-4 flex-1 text-sm text-muted-foreground">
                {link?.detail ?? provider.blurb}
              </p>

              {link?.last_synced_at ? (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Last synced {new Date(link.last_synced_at).toLocaleString()}
                </p>
              ) : null}

              <div className="mt-5 flex gap-2">
                {link ? (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => sync.mutate(link.id)}
                      className="bg-brand-gradient glow-brand rounded-lg px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      Sync now
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => disconnect.mutate(link.id)}
                      className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() =>
                      connect.mutate({ key: provider.key, detail: provider.blurb })
                    }
                    className="bg-brand-gradient glow-brand rounded-lg px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Connect {provider.name}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}

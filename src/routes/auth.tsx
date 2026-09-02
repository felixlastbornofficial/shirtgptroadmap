import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Orbs } from "@/components/AppShell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to ShirtGPT — AI Roadmap Engine" },
      {
        name: "description",
        content:
          "Sign in to ShirtGPT to generate AI roadmaps for any goal, track milestones, and sync them with the tools you already use.",
      },
      { property: "og:title", content: "Sign in to ShirtGPT" },
      {
        property: "og:description",
        content: "Turn any goal into a step-by-step roadmap you can actually finish.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) router.navigate({ to: "/" });
  }, [loading, session, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    router.navigate({ to: "/" });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 text-foreground">
      <Orbs />
      <div className="panel relative z-10 w-full max-w-md p-7">
        <div className="flex items-center gap-3">
          <div className="bg-brand-gradient glow-brand font-display grid size-10 place-items-center rounded-xl text-lg font-bold text-primary-foreground">
            S
          </div>
          <div>
            <p className="font-display text-lg leading-none font-semibold">ShirtGPT</p>
            <p className="mt-1 text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
              Roadmap Engine
            </p>
          </div>
        </div>

        <h1 className="mt-7 text-3xl font-bold">
          {mode === "signin" ? "Welcome back" : "Start your first roadmap"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Describe any goal. ShirtGPT turns it into ordered milestones you can track and sync.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label htmlFor="email" className="text-xs text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="bg-brand-gradient glow-brand w-full rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[11px] tracking-widest text-muted-foreground uppercase">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={google}
          className="w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm font-medium transition-colors hover:bg-foreground/10"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-accent hover:underline"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

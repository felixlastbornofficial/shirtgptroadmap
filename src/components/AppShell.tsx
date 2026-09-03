import { Link, useRouter } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

function initials(value: string) {
  const clean = value.replace(/[^a-zA-Z ]/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const second = parts[1] ?? "";
  if (!first) return "SG";
  if (!second) return first.slice(0, 2).toUpperCase();
  return (first.slice(0, 1) + second.slice(0, 1)).toUpperCase();
}

export function Orbs() {
  return (
    <>
      <div className="orb -top-40 -left-32 size-[520px] bg-primary/30 blur-[140px]" />
      <div className="orb top-1/3 -right-40 size-[460px] bg-accent/20 blur-[150px]" />
      <div className="orb -bottom-40 left-1/3 size-[480px] bg-rose/20 blur-[150px]" />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Orbs />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-brand-gradient glow-brand font-display grid size-10 place-items-center rounded-xl text-lg font-bold text-primary-foreground">
              S
            </div>
            <div>
              <p className="font-display text-lg leading-none font-semibold">ShirtGPT</p>
              <p className="mt-1 text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
                Roadmap Engine
              </p>
            </div>
          </Link>

          <nav className="order-3 flex w-full items-center gap-6 text-sm text-muted-foreground sm:order-none sm:w-auto sm:gap-8">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-foreground" }}
              className="transition-colors hover:text-foreground"
            >
              Roadmaps
            </Link>
            <Link
              to="/progress"
              activeProps={{ className: "text-foreground" }}
              className="transition-colors hover:text-foreground"
            >
              Progress
            </Link>
            <Link
              to="/integrations"
              activeProps={{ className: "text-foreground" }}
              className="transition-colors hover:text-foreground"
            >
              Integrations
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={signOut}
              className="hidden rounded-full border border-border bg-foreground/5 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Sign out
            </button>
            <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-rose to-primary text-xs font-semibold text-primary-foreground">
              {initials(user?.email ?? "SG")}
            </div>
          </div>
        </header>

        <main className="mt-8">{children}</main>
      </div>
    </div>
  );
}

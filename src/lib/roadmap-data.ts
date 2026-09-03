import { supabase } from "@/integrations/supabase/client";

export type Roadmap = {
  id: string;
  title: string;
  goal: string;
  summary: string | null;
  timeframe: string;
  level: string;
  status: string;
  created_at: string;
};

export type Milestone = {
  id: string;
  roadmap_id: string;
  title: string;
  description: string | null;
  position: number;
};

export type Step = {
  id: string;
  milestone_id: string;
  roadmap_id: string;
  title: string;
  done: boolean;
  position: number;
};

export type Integration = {
  id: string;
  provider: string;
  status: string;
  detail: string | null;
  last_synced_at: string | null;
};

export const PROVIDERS = [
  {
    key: "notion",
    name: "Notion",
    short: "NT",
    blurb: "Mirror every milestone into a Notion page.",
  },
  {
    key: "trello",
    name: "Trello",
    short: "TR",
    blurb: "Push each step to a Trello board as a card.",
  },
  {
    key: "google_calendar",
    name: "Google Calendar",
    short: "GC",
    blurb: "Block time for your next steps automatically.",
  },
] as const;

export async function fetchRoadmaps() {
  const { data, error } = await supabase
    .from("roadmaps")
    .select("id, title, goal, summary, timeframe, level, status, created_at")
    .eq("archived", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Roadmap[];
}

export async function fetchAllSteps() {
  const { data, error } = await supabase
    .from("steps")
    .select("id, milestone_id, roadmap_id, title, done, position")
    .order("position");
  if (error) throw error;
  return (data ?? []) as Step[];
}

export async function fetchRoadmap(id: string) {
  const [roadmapRes, milestoneRes, stepRes] = await Promise.all([
    supabase
      .from("roadmaps")
      .select("id, title, goal, summary, timeframe, level, status, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("milestones")
      .select("id, roadmap_id, title, description, position")
      .eq("roadmap_id", id)
      .order("position"),
    supabase
      .from("steps")
      .select("id, milestone_id, roadmap_id, title, done, position")
      .eq("roadmap_id", id)
      .order("position"),
  ]);

  if (roadmapRes.error) throw roadmapRes.error;
  if (milestoneRes.error) throw milestoneRes.error;
  if (stepRes.error) throw stepRes.error;

  return {
    roadmap: roadmapRes.data as Roadmap | null,
    milestones: (milestoneRes.data ?? []) as Milestone[],
    steps: (stepRes.data ?? []) as Step[],
  };
}

export async function toggleStep(id: string, done: boolean) {
  const { error } = await supabase
    .from("steps")
    .update({ done, completed_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchIntegrations() {
  const { data, error } = await supabase
    .from("integrations")
    .select("id, provider, status, detail, last_synced_at");
  if (error) throw error;
  return (data ?? []) as Integration[];
}

export function percent(steps: { done: boolean }[]) {
  if (steps.length === 0) return 0;
  return Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
}

export async function connectIntegration(provider: string, detail: string) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("You need to be signed in.");
  const { error } = await supabase.from("integrations").insert({
    user_id: userId,
    provider,
    detail,
    status: "connected",
    last_synced_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function disconnectIntegration(id: string) {
  const { error } = await supabase.from("integrations").delete().eq("id", id);
  if (error) throw error;
}

export async function syncIntegration(id: string) {
  const { error } = await supabase
    .from("integrations")
    .update({ last_synced_at: new Date().toISOString(), status: "connected" })
    .eq("id", id);
  if (error) throw error;
}

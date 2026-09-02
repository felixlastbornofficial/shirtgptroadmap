import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GenerateInput = z.object({
  goal: z.string().min(3).max(400),
  timeframe: z.string().min(2).max(40),
  level: z.string().min(2).max(40),
});

const RoadmapShape = z.object({
  title: z.string(),
  summary: z.string(),
  milestones: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional().default(""),
        steps: z.array(z.string()).min(1),
      }),
    )
    .min(3),
});

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "milestones"],
  properties: {
    title: { type: "string", description: "Short punchy roadmap title" },
    summary: { type: "string", description: "One or two sentence overview" },
    milestones: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "steps"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          steps: {
            type: "array",
            minItems: 3,
            maxItems: 6,
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

export const generateRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "system",
            content:
              "You are ShirtGPT, a planning engine. Turn any goal into a realistic, ordered roadmap. " +
              "Milestones must be sequential phases; steps must be concrete, verifiable actions (no vague advice). " +
              "Adapt depth to the stated skill level and fit the work inside the stated timeframe.",
          },
          {
            role: "user",
            content: `Goal: ${data.goal}\nTimeframe: ${data.timeframe}\nSkill level: ${data.level}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "roadmap", strict: true, schema: JSON_SCHEMA },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429)
        throw new Error("Too many requests right now — try again in a moment.");
      if (res.status === 402)
        throw new Error("AI credits are exhausted. Add credits in Lovable to keep generating.");
      throw new Error(`Roadmap generation failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("The AI returned an empty roadmap. Try rewording your goal.");

    const parsed = RoadmapShape.parse(JSON.parse(content));

    const { supabase, userId } = context;

    const { data: roadmap, error: roadmapError } = await supabase
      .from("roadmaps")
      .insert({
        user_id: userId,
        title: parsed.title,
        goal: data.goal,
        summary: parsed.summary,
        timeframe: data.timeframe,
        level: data.level,
      })
      .select("id")
      .single();

    if (roadmapError || !roadmap) throw new Error(roadmapError?.message ?? "Could not save roadmap.");

    for (const [index, milestone] of parsed.milestones.entries()) {
      const { data: saved, error: milestoneError } = await supabase
        .from("milestones")
        .insert({
          roadmap_id: roadmap.id,
          user_id: userId,
          title: milestone.title,
          description: milestone.description,
          position: index,
        })
        .select("id")
        .single();

      if (milestoneError || !saved) throw new Error(milestoneError?.message ?? "Could not save milestone.");

      const steps = milestone.steps.map((title, stepIndex) => ({
        milestone_id: saved.id,
        roadmap_id: roadmap.id,
        user_id: userId,
        title,
        position: stepIndex,
      }));

      const { error: stepsError } = await supabase.from("steps").insert(steps);
      if (stepsError) throw new Error(stepsError.message);
    }

    return { id: roadmap.id as string };
  });

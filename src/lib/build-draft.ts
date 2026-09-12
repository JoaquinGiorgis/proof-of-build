import { z } from "zod";

/** The shape the create wizard collects and the API validates. */
export const buildDraftSchema = z.object({
  eventSlug: z.string().min(1),
  name: z.string().trim().min(2, "Give the project a name.").max(64),
  tagline: z
    .string()
    .trim()
    .min(4, "One line about what it does.")
    .max(140, "Keep it to one line."),
  githubUrl: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === "" || /^[\w.-]+\.[a-z]{2,}\/\S+$/i.test(value) || /^https?:\/\//i.test(value), {
      message: "That does not look like a URL.",
    })
    .optional()
    .default(""),
  demoUrl: z.string().trim().max(200).optional().default(""),
  team: z
    .array(z.string().trim().min(1))
    .min(1, "At least one builder.")
    .max(8, "Up to eight builders."),
  trackSlug: z.string().min(1, "Pick a track."),
});

export type BuildDraft = z.infer<typeof buildDraftSchema>;

export const EMPTY_DRAFT: BuildDraft = {
  eventSlug: "",
  name: "",
  tagline: "",
  githubUrl: "",
  demoUrl: "",
  team: [],
  trackSlug: "",
};

/** "Joaco · Luca · Artu" and "Joaco, Luca, Artu" both parse. */
export function parseTeam(input: string): string[] {
  return input
    .split(/[·,]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function formatTeam(team: string[]) {
  return team.join(" · ");
}

import { z } from "zod";
import { LIMITS } from "./config";

const finite = z.coerce.number().refine(Number.isFinite, "Must be a number");

export const keyResultSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().max(200).default(""),
  kind: z.enum(["outcome", "input"]).default("outcome"),
  start: finite.default(0),
  current: finite.default(0),
  target: finite.default(0),
  unit: z.string().max(24).default(""),
});
export type KeyResult = z.infer<typeof keyResultSchema>;

export const objectiveInputSchema = z.object({
  title: z.string().max(200),
  why: z.string().max(400),
  key_results: z.array(keyResultSchema).max(LIMITS.keyResults),
});
export type ObjectiveInput = z.infer<typeof objectiveInputSchema>;

export type Objective = ObjectiveInput & {
  id: string;
  quarter: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export const commitmentSchema = z.object({
  text: z.string().max(240),
  krId: z.string().max(40).default(""),
  done: z.boolean().default(false),
});
export type Commitment = z.infer<typeof commitmentSchema>;

export const reflectionSchema = z.object({
  moved: z.string().max(4000).default(""),
  avoided: z.string().max(4000).default(""),
  lesson: z.string().max(4000).default(""),
  energy: z.number().int().min(0).max(5).default(0),
});
export type Reflection = z.infer<typeof reflectionSchema>;

export const reviewInputSchema = z.object({
  carried: z.array(commitmentSchema).max(LIMITS.commitments),
  reflection: reflectionSchema,
  confidence: z.record(z.string().max(40), z.number().int().min(1).max(10)),
  kr_values: z.record(z.string().max(40), z.number().finite().nullable()),
  next: z.array(commitmentSchema).max(LIMITS.commitments),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export type Review = ReviewInput & {
  week: string;
  sparring: string | null;
  completed_at: string | null;
  updated_at: string;
};

export const profileInputSchema = z.object({
  display_name: z.string().trim().max(80),
  timezone: z.string().min(1).max(64).refine(isTimeZone, "Unknown time zone"),
  review_weekday: z.number().int().min(0).max(6),
  reminders_enabled: z.boolean(),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

export type Profile = ProfileInput & {
  id: string;
  email: string | null;
  onboarded_at: string | null;
};

export function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function emptyReflection(): Reflection {
  return { moved: "", avoided: "", lesson: "", energy: 0 };
}

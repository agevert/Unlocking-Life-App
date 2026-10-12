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
  /** Id of the aspiration foundation this objective serves, if tagged. */
  foundation: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------- aspiration

export const foundationSchema = z.object({
  id: z.string().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/, "Invalid id"),
  name: z.string().max(80).default(""),
});
export type Foundation = z.infer<typeof foundationSchema>;

export const aspirationInputSchema = z.object({
  horizon_year: z.number().int().min(2000).max(2200).nullable(),
  vision: z.string().max(1200),
  foundations: z.array(foundationSchema).max(LIMITS.foundations),
  questions: z.array(z.string().max(240)).max(LIMITS.questions),
});
export type AspirationInput = z.infer<typeof aspirationInputSchema>;

export type Aspiration = AspirationInput & { updated_at: string | null };

export function emptyAspiration(): Aspiration {
  return { horizon_year: null, vision: "", foundations: [], questions: [], updated_at: null };
}

/** True once there is anything worth showing or sending to the sparring partner. */
export function hasAspiration(a: Aspiration | null | undefined): a is Aspiration {
  return !!a && (!!a.vision.trim() || a.foundations.some((f) => f.name.trim()) || a.questions.some((q) => q.trim()));
}

/** Display name of a foundation, falling back to its position when unnamed. */
export function foundationLabel(a: Aspiration, id: string | null): string | null {
  if (!id) return null;
  const i = a.foundations.findIndex((f) => f.id === id);
  if (i < 0) return null;
  return a.foundations[i].name.trim() || `Foundation ${i + 1}`;
}

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

export const APP_NAME = "Unlocking Life";
export const APP_TAGLINE = "Turn intentional action into increased capability.";

/** The constraints are the product. Change them deliberately. */
export const LIMITS = {
  objectives: 3,
  keyResults: 4,
  commitments: 3,
  foundations: 3,
  questions: 5,
  evidencePerDay: 20,
} as const;

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";

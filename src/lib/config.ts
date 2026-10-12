export const APP_NAME = "Threefold";
export const APP_TAGLINE = "Three objectives. Thirty minutes a week. A sparring partner who doesn't let you off the hook.";

/** The constraints are the product. Change them deliberately. */
export const LIMITS = {
  objectives: 3,
  keyResults: 4,
  commitments: 3,
  /** One foundation per objective slot, so a full quarter touches every foundation once. */
  foundations: 3,
  questions: 5,
} as const;

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";

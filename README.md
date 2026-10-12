# Threefold

Three objectives a quarter, a 30-minute weekly review, and a sparring partner (Claude) that reads your review and pushes back where you go easy on yourself.

**Stack:** Next.js 15 (App Router, Server Actions) · Supabase (Postgres, Auth, row-level security) · Claude API · Vercel · Resend · installable as a phone app (PWA).

---

## What's in the box

| Area | What it does |
|---|---|
| **Now** | This week's commitments to tick off, objectives with progress bars against a pace marker, latest confidence |
| **Weekly review** | Four steps: last week's commitments, numbers and confidence, reflection, next week's three. Autosaves; ⌘/Ctrl + Enter completes |
| **Sparring** | Streams a challenge from Claude based on the review, the objectives and recent history. Rate-limited per user |
| **Objectives** | Autosaving editor. Plan next quarter or look back at the last one |
| **Log** | Follow-through rate, share of commitments linked to a key result, energy, confidence chart, all past reviews |
| **Quarter strip** | One cell per ISO week: reviewed, draft, missed. Tap to open that week |
| **Onboarding** | Three screens: the principles, name and review day (time zone auto-detected), first objective |
| **Reminders** | Daily cron emails people on their review day if that week isn't reviewed |
| **Account** | Passwordless sign-in (link or 6-digit code, optional Google), settings, data export (GDPR Art. 20), account deletion |
| **Marketing & legal** | Landing page, Impressum, privacy policy and terms templates |

The product rules are enforced in the database, not just the UI: max 3 objectives per quarter, 4 key results per objective, 3 commitments per week.

---

## 1. Run it locally (15 minutes)

You need Node 20.11+ (22 recommended) and a free [Supabase](https://supabase.com) project.

```bash
npm install
cp .env.example .env.local      # then fill in the values (see below)
npm run dev                     # http://localhost:3000
```

### Supabase setup

1. **Create a project.** Choose region **Frankfurt (eu-central-1)** for GDPR.
2. **Create the tables.** Open *SQL Editor*, paste `supabase/migrations/0001_init.sql`, and run it. If you use the Supabase CLI instead, run `supabase db push`.
3. **Copy the keys.** *Project Settings → API keys*: the URL, the **publishable** key and the **secret** key go into `.env.local`.
4. **Configure auth URLs.** *Authentication → URL Configuration*:
   - Site URL: `http://localhost:3000` (later, your production domain)
   - Redirect URLs: `http://localhost:3000/**` and `https://your-domain.com/**`
5. **Add the sign-in code to the email.** *Authentication → Emails → Magic Link*. Add the one-time code so people using the installed phone app can type it in:
   ```html
   <h2>Your sign-in link</h2>
   <p><a href="{{ .ConfirmationURL }}">Sign in to Threefold</a></p>
   <p>Or enter this code: <strong>{{ .Token }}</strong></p>
   ```
6. **Set up email delivery for production.** *Authentication → SMTP*. Supabase's built-in mailer only sends a handful of emails per hour. Use Resend's SMTP (`smtp.resend.com`, port 465, user `resend`, password = your API key).

### Claude

Create an API key at [console.anthropic.com](https://console.anthropic.com) and set `ANTHROPIC_API_KEY`.
- `ANTHROPIC_MODEL` defaults to `claude-sonnet-5-5`.
- `SPAR_DAILY_LIMIT` caps how many sparring requests each user can make per 24 hours (default 8).
- Without a key, the app still works; the sparring panel is simply hidden.

---

## 2. Deploy (Vercel)

1. Push this folder to a GitHub repository and import it in [Vercel](https://vercel.com/new).
2. Add every variable from `.env.example` under *Settings → Environment Variables*, with `NEXT_PUBLIC_SITE_URL` set to your production URL.
3. Deploy. Functions run in Frankfurt (`fra1`, set in `vercel.json`).
4. **Reminders.** `vercel.json` runs `/api/cron/reminders` daily at 13:00 UTC. Vercel sends `CRON_SECRET` automatically. Verify a sending domain in [Resend](https://resend.com) and set `RESEND_API_KEY` and `REMINDER_FROM`.
5. **Optional: Google sign-in.** Enable Google under *Supabase → Authentication → Providers*, then set `NEXT_PUBLIC_GOOGLE_AUTH=true`.

---

## 3. Before you launch publicly

- [ ] Fill in `src/lib/legal.ts`. Anything still in `[brackets]` is highlighted on the legal pages.
- [ ] Have the privacy policy and terms reviewed by a lawyer. They are templates.
- [ ] Sign data processing agreements (AVV/DPA) with Supabase, Vercel, Anthropic and Resend.
- [ ] Confirm your employer allows the side activity (Nebentätigkeit) before charging money.
- [ ] Decide which entity publishes the app; a GmbH limits personal liability.
- [ ] Enable Supabase *Point-in-Time Recovery* or at least daily backups.
- [ ] Turn on *Leaked password protection* and CAPTCHA (hCaptcha/Turnstile) in Supabase Auth to stop sign-up abuse.
- [ ] Set a monthly spend limit on the Anthropic console.

---

## Scripts

```bash
npm run dev        # local development
npm run build      # production build
npm run check      # typecheck + lint + unit tests
npm test           # unit and route tests (calendar maths, progress, prompt, redirect safety,
                   # sparring, sign-in callbacks, reminder cron — Supabase, Claude and Resend mocked)
```

**Database security test.** Run this against a throwaway local Postgres, never production:

```bash
psql -d test -f supabase/tests/local_supabase_stub.sql
psql -d test -f supabase/migrations/0001_init.sql
psql -d test -f supabase/tests/rls_test.sql
```

It checks four things:
- users can't read or change each other's data
- the three-objective limit holds
- the profile email can't be edited directly
- deleting an account removes all of its data

---

## How it's built

```
src/
  app/
    page.tsx                  landing page
    login/, auth/             passwordless sign-in (PKCE link, OTP code, token-hash confirm)
    app/welcome/              onboarding
    app/(main)/               signed-in shell: header, quarter strip, tabs / bottom bar
      page.tsx                Now
      review/[week]/          weekly review (ISO week in the URL, e.g. /app/review/2026-W42)
      objectives/  log/  guide/  settings/
    api/spar/                 streams Claude's challenge, rate-limited, saved to the review
    api/export/               GDPR data export
    api/cron/reminders/       daily reminder emails
    legal/                    Impressum, privacy, terms
  components/                 UI (client components only where interaction needs them)
  lib/
    week.ts                   ISO-week and quarter maths in UTC, time-zone aware "today"
    okr.ts                    progress, pace status, stats
    actions.ts                server actions, all inputs validated with zod
    data.ts                   server-side loaders
    prompt.ts                 sparring prompt
    supabase/                 browser, server, middleware and admin clients
supabase/migrations/          schema, RLS policies, limits, triggers
```

### Design decisions

- **Weeks follow the user's time zone.** Dates are plain `YYYY-MM-DD` strings with UTC arithmetic, so daylight-saving changes and server location never shift a week.
- **A week belongs to the quarter of its Thursday** (the ISO convention). Week 40 of 2026 counts as Q4.
- **Only the latest completed review updates the live key-result values.** Editing an old review can't overwrite current numbers.
- **Reviews autosave as drafts.** "Complete" is the deliberate act: it ticks off last week's commitments and moves the numbers.
- **Self-hosted fonts.** Loading Google Fonts from Google's CDN has been ruled a GDPR violation in Germany (LG München, 2022).
- **No analytics or tracking by default.** If you add analytics, use a cookieless EU tool such as Plausible, and update the privacy policy.

### Ideas for later

- Stripe subscription with a 30-day trial
- Native iOS and Android wrapper (Capacitor) for App Store distribution and push notifications
- German and Spanish translations
- End-of-quarter debrief written by Claude from the full log

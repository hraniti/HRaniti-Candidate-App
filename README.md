# HRaniti — Candidate App

This is the full candidate-side MVP from your build spec: Sign Up → Verify →
Resume Upload → AI Profile → Preferences → Availability & Visa → Consent →
Dashboard. Built with Next.js (hosted on Vercel) and Supabase (database +
auth + file handling). Both have free tiers, so this costs **$0/month**
until you have real usage, and even then the paid tiers start around
$25/month combined — not per-seat, not per-candidate.

Everything below assumes zero coding background. Follow it top to bottom.

---

## 1. Create your accounts (10 minutes)

1. **GitHub** — github.com → sign up. This is where your code lives.
2. **Vercel** — vercel.com → "Sign up with GitHub". This is what serves your website.
3. **Supabase** — supabase.com → "Sign up with GitHub". This is your database, login system, and file storage.
4. **OpenAI** — platform.openai.com → sign up, add a card. You'll create an API key in step 3. Resume parsing costs a fraction of a cent per resume (gpt-4o-mini), so even a few thousand sign-ups costs a few dollars.

## 2. Push this code to GitHub

If you're comfortable with the terminal:
```bash
cd hraniti-app
git init
git add .
git commit -m "Initial candidate MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/hraniti-app.git
git push -u origin main
```
If not: go to github.com → New repository → "uploading an existing file" →
drag the whole unzipped folder in. (Skip `node_modules` — it's huge and
regenerates automatically; the `.gitignore` in this project already
excludes it.)

## 3. Set up Supabase

1. supabase.com → New project. Pick a name and a strong database password (save it somewhere).
2. Once it's ready, go to **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql` from this project, and click **Run**. This creates your tables, security rules, and a few sample job listings.
3. Go to **Authentication → Providers**:
   - **Email**: already on by default. Go to **Authentication → Emails** and make sure "Confirm email" uses the OTP/6-digit-code template (Supabase supports this out of the box).
   - **Google**: toggle it on. You'll need a Google Cloud OAuth Client ID — Supabase's page links directly to the Google Cloud steps. Paste the Client ID/Secret it gives you back into Supabase.
   - **LinkedIn (OIDC)**: toggle on "LinkedIn (OIDC)". Create an app at linkedin.com/developers, add the redirect URL Supabase shows you, paste the credentials back in.
4. Go to **Project Settings → API**. Copy the **Project URL** and the **anon public key** — you'll need these in step 5.

> Heads up on LinkedIn: LinkedIn has restricted their API significantly.
> Full profile import (auto-filling a resume from a LinkedIn profile) is
> no longer reliably available to small companies. This build follows the
> spec's own recommendation: LinkedIn sign-in works for authentication,
> but "import from LinkedIn" is left as a manual URL field rather than an
> automatic import, so you're not blocked waiting on LinkedIn's approval process.

## 4. Get your OpenAI API key

platform.openai.com → API keys → Create new key. Copy it. This powers the
resume-parsing step (Screen 3 → Screen 4).

## 5. Deploy to Vercel

1. vercel.com → **Add New → Project** → import the GitHub repo you pushed.
2. Before clicking Deploy, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = (from step 3.4)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (from step 3.4)
   - `OPENAI_API_KEY` = (from step 4)
3. Click **Deploy**. In about a minute you'll get a live URL like `hraniti-app.vercel.app`.
4. Back in Supabase → **Authentication → URL Configuration**, set your Site URL to that Vercel URL, and add `https://your-app.vercel.app/auth/callback` as a redirect URL. Do the same inside your Google/LinkedIn app settings (they also need the exact redirect URL whitelisted).

That's it — candidates can now sign up, upload a resume, get an AI-built
profile, set preferences, and land on a dashboard, end to end.

## 6. Connect your existing domain (optional, still free on Vercel's side)

Vercel → your project → **Settings → Domains** → add your domain and
follow the DNS instructions. Only cost here is whatever you already pay
your domain registrar.

---

## Why this setup is cheap *and* hard to knock over

- **No server you manage.** Vercel and Supabase both autoscale — there's
  no single machine a traffic spike or a competitor's "attack" can take
  down. You're on the same infrastructure tier as much larger products.
- **Pay-for-usage, not pay-for-headroom.** You're not renting a big server
  "just in case." Costs track actual candidates, not potential ones.
- **Data safety is built in**, not bolted on: Supabase Row Level Security
  means a candidate's row is only ever readable/writable by that
  candidate (see `supabase/schema.sql`) — even if there were a bug in the
  app code, the database itself refuses to leak one user's data to another.

## What to build next (in order of what candidates will hit first)

1. **Employer app** — currently a placeholder page. Recruiters need their own sign-up, search, and unlock-resume flow.
2. **"View all matches" / job search page** — dashboard currently shows top matches; a full searchable job board is the natural next screen.
3. **Skill Assessment flow** — referenced in the Getting Started checklist but not yet built.
4. **Video pitch upload** — referenced in Career Actions.
5. Swap the simple skills/track-overlap match score for a smarter model once you have real usage data to tune it against.

## Local development (only if/when you hire or bring on a developer)

```bash
npm install
cp .env.example .env.local   # fill in your real keys
npm run dev
```
Open http://localhost:3000

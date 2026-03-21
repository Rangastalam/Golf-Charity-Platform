# GolfGives — Golf Charity Subscription Platform

A full-stack subscription platform where golfers track their Stableford scores, enter monthly prize draws, and donate a percentage of their subscription to a charity of their choice.

---

## Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Framework      | Next.js 14 (App Router)                 |
| Language       | JavaScript / JSX (no TypeScript)        |
| Database       | Supabase (PostgreSQL + RLS)             |
| Auth           | Supabase Auth (email + OAuth)           |
| Payments       | Stripe (subscriptions + webhooks)       |
| Email          | Resend                                  |
| Styling        | Tailwind CSS v4                         |
| Animations     | Framer Motion                           |
| Deployment     | Vercel (Node.js 20)                     |

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- npm 10+
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account
- A [Resend](https://resend.com) account

### 1. Clone the repository

```bash
git clone https://github.com/your-org/golf-charity-platform.git
cd golf-charity-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.production.example .env.local
```

Open `.env.local` and fill in every value. See the **Environment Variables** section below.

### 4. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL migrations in `supabase/migrations/` via the Supabase SQL editor
3. Enable Row Level Security on all tables
4. Create a `winner-proofs` storage bucket (with public read access)
5. Configure Auth redirect URLs in Supabase Dashboard → Authentication → URL Configuration:
   - `http://localhost:3000/reset-password`
   - `http://localhost:3000/api/auth/callback`
6. Set **Site URL** to `http://localhost:3000`

### 5. Set up Stripe

1. Create a product with two prices (monthly and yearly recurring) in [Stripe Dashboard](https://dashboard.stripe.com)
2. Add a webhook endpoint: `http://localhost:3000/api/webhooks/stripe`
3. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. For local webhook forwarding:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 6. Seed initial data

```bash
node scripts/seed-production.js
```

Inserts 3 featured charities, sample events, and optionally creates an admin user.

### 7. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

All required variables are listed in `.env.production.example` with full explanations.

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API ⚠️ server-only |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys ⚠️ server-only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → endpoint details ⚠️ server-only |
| `STRIPE_MONTHLY_PRICE_ID` | Stripe → Products → your product → Pricing |
| `STRIPE_YEARLY_PRICE_ID` | Stripe → Products → your product → Pricing |
| `RESEND_API_KEY` | Resend → API Keys ⚠️ server-only |
| `EMAIL_FROM` | A verified sender address in your Resend account |
| `NEXT_PUBLIC_APP_URL` | Your deployment URL, no trailing slash |

---

## Deployment Guide (Vercel)

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "Initial production deployment"
git push origin main
```

### Step 2 — Create Vercel project

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework will be auto-detected as **Next.js**

### Step 3 — Add environment variables

In Vercel → Settings → Environment Variables, add every variable from `.env.production.example`.
Select **Production** + **Preview** environments.

### Step 4 — Configure Supabase Auth redirect URLs

In Supabase → Authentication → URL Configuration, add:

```
https://your-vercel-url.vercel.app/reset-password
https://your-vercel-url.vercel.app/api/auth/callback
```

Set **Site URL** to your Vercel deployment URL.

### Step 5 — Add Stripe webhook endpoint

In Stripe Dashboard → Webhooks → Add endpoint:

- URL: `https://your-vercel-url.vercel.app/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel.

### Step 6 — Deploy

Vercel deploys automatically on every push to `main`. For a manual deploy:

```bash
npx vercel --prod
```

### Step 7 — Run pre-deployment checks

```bash
node scripts/pre-deploy-check.js
```

### Step 8 — Seed production data

Run once on the production environment after first deploy:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-production.js
```

---

## Test Credentials

### Stripe Test Cards

| Scenario | Card Number | Expiry | CVC |
|---|---|---|---|
| Successful payment | `4242 4242 4242 4242` | Any future | Any 3 digits |
| Card declined | `4000 0000 0000 0002` | Any future | Any 3 digits |
| Insufficient funds | `4000 0000 0000 9995` | Any future | Any 3 digits |
| 3D Secure required | `4000 0025 0000 3155` | Any future | Any 3 digits |

### Test Accounts

Create accounts via `/signup`. To promote a user to admin:

```sql
-- Run in Supabase SQL editor
UPDATE profiles SET is_admin = true WHERE email = 'your@email.com';
```

Or use the seed script — it will prompt for an admin email.

---

## Project Structure

```
golf-charity-platform/
├── app/
│   ├── (auth)/                  # Login, signup, forgot/reset-password
│   ├── (public)/                # Public pages: charities, pricing, how-it-works
│   ├── admin/                   # Admin dashboard (admin-only)
│   ├── api/
│   │   ├── admin/               # Admin API endpoints
│   │   ├── auth/                # welcome email, password reset, callback
│   │   ├── draws/               # Draw CRUD + action endpoints
│   │   ├── health/              # Health check (Supabase + Stripe probe)
│   │   ├── scores/              # Score submit, list, delete
│   │   ├── subscriptions/       # Stripe checkout, portal, status
│   │   ├── user/                # User charity selection
│   │   ├── webhooks/stripe/     # Stripe webhook handler
│   │   └── winners/             # Winner list + proof upload
│   ├── dashboard/               # Member dashboard (authenticated)
│   ├── layout.js                # Root layout — fonts, metadata, providers
│   ├── page.jsx                 # Homepage
│   └── sitemap.js               # Dynamic XML sitemap
├── components/
│   ├── dashboard/               # Score entry, charity selector, draw entry
│   └── shared/                  # Toast, ErrorBoundary, Providers, CharityCard
├── lib/
│   ├── auth.js                  # getCurrentUser, requireAdmin
│   ├── drawEngine.js            # Random/algorithmic draw + winner resolution
│   ├── email.js                 # Resend wrapper
│   ├── emailTemplates.js        # HTML email templates
│   ├── errorHandler.js          # Supabase/Stripe error categorisation
│   ├── logger.js                # Structured logger (JSON in prod)
│   ├── notificationTriggers.js  # Email trigger functions
│   ├── prizePool.js             # Prize pool and rollover calculations
│   ├── rateLimit.js             # Sliding-window in-memory rate limiter
│   ├── stripe.js                # Stripe server-side client
│   ├── supabase.js              # Browser + server Supabase clients
│   ├── supabase-admin.js        # Service role client (server-only)
│   └── validation.js            # Input validators + magic-byte image check
├── public/
│   └── robots.txt
├── scripts/
│   ├── pre-deploy-check.js      # Pre-deployment health check script
│   └── seed-production.js       # Production data seeder
├── tests/
│   └── checklist.md             # Manual QA checklist (16 sections)
├── .env.production.example      # Environment variable template
├── next.config.mjs              # Next.js config with env validation
├── vercel.json                  # Vercel deployment config
└── package.json
```

---

## Key Features

- **Stableford score tracking** — Submit, view, and delete monthly scores (1–45)
- **Monthly prize draws** — Algorithmic or random draw; three prize tiers (3, 4, 5 match)
- **Charity selection** — Choose a charity and contribution percentage (10–100%, step 5%)
- **Stripe subscriptions** — Monthly and yearly plans; billing portal for self-service management
- **Winner proof upload** — Image upload with magic-byte MIME validation, 5 MB limit
- **Admin dashboard** — Draw lifecycle, winner verification + bulk pay, charity + user management
- **Email notifications** — Welcome, draw results, and winner emails via Resend
- **Full password reset flow** — Forgot password → email → token verification → update
- **Security** — CSP headers, rate limiting, RLS on all tables, HSTS, no X-Powered-By
- **Performance** — next/font, AVIF/WebP images, compression, strict mode, package optimisation

---

## PRD Compliance

All 15 prompts of the Product Requirements Document are implemented:

| Prompts | Area |
|---|---|
| 1–3 | Authentication, member dashboard, score management |
| 4–6 | Draw engine, prize pools, winner management |
| 7–9 | Charities, Stripe subscriptions, admin panel |
| 10 | Draws admin UI, winner proof upload |
| 11 | Public pages — homepage, how-it-works, pricing, charities |
| 12 | Email notifications via Resend |
| 13 | Performance optimisation + security hardening |
| 14 | Error handling, toast system, API edge cases, QA checklist |
| 15 | Password reset flow + production deployment |

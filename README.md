# Loyalty Points App

A simple loyalty points app for a small shop. Customers get a QR code in the app; staff scan it at checkout and give, redeem, or adjust points. No dedicated scanner hardware, no native app store distribution — runs entirely on free-tier infrastructure.

## Stack

- **[Next.js](https://nextjs.org/)** — single app, both customer and staff views, deployed as an installable PWA
- **[Vercel](https://vercel.com/)** — hosting (free tier)
- **[Supabase](https://supabase.com/)** — Postgres database + auth (free tier, up to 50k MAU)
- **QR scanning** — browser camera (`getUserMedia`) + [`html5-qrcode`](https://github.com/mebjas/html5-qrcode) or [`zxing-js`](https://github.com/zxing-js/library), no external hardware

Auth: **email OTP (magic link)** and **Google OAuth** only. Phone OTP is intentionally not used — it requires a paid third-party SMS provider and breaks the $0/month goal.

## Data Model

Three tables: `customers`, `staff`, `transactions`. See [`design-doc.md`](./design-doc.md) for full schema and rationale. In short:

- `customers.points_balance` is a cached total; `transactions` is the source of truth.
- Every award/redeem/adjustment writes a `transactions` row **and** updates `customers.points_balance` in a single DB transaction — never as separate writes.
- `transactions.type` is one of `earn`, `redeem`, or `adjustment` (redeem/adjustment require a `note`).

## Getting Started

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Create a [Supabase](https://supabase.com/) project, then run the schema from `design-doc.md` (Section 7) in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and anon key.
4. Run the dev server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000).

## Deployment

Push to GitHub, connect the repo on [Vercel](https://vercel.com/), and set the same environment variables there. Every push to `main` auto-deploys.

## Project Status

Early prototype. See `design-doc.md` for the full design doc, open questions, and planned future enhancements (rewards catalog, staff permission tiers, etc.).
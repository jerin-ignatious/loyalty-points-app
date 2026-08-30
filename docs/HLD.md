# Loyalty Points App — Design Doc

## 1. Summary

A low-cost, low-effort web app (PWA) that lets a small shop run a customer loyalty points program without buying any dedicated QR/barcode scanner hardware and without app store fees or approval. Each customer has an account with a personal QR code inside the app. At checkout, the customer shows their QR code, the shop owner scans it using their own phone's camera (browser-based scanning — no extra hardware, no native app needed), and then manually enters the number of points to award for that purchase.

## 2. Goals

- Give every customer a persistent points account tied to their identity.
- Let the shop owner identify a customer instantly at checkout via QR code, without typing a phone number or searching a list.
- Let the shop owner award points manually (since points are usually tied to purchase amount, not scanned items).
- Keep hardware **and hosting** cost at zero — everything runs on phones the shop and customers already own, and the whole app runs on free-tier infrastructure.
- Support 500–5,000 customers comfortably.
- No profit expected from this app — cost and effort minimization take priority over scalability or polish.

## 3. Non-Goals (v1)

- No item-level barcode scanning or POS/inventory integration.
- No multi-location / franchise support (single shop only, can revisit later).
- No payment processing — this is points only, not a payment app.
- No native App Store / Play Store distribution (see Section 8 — this is a PWA instead).

## 4. Users & Roles

| Role | Description |
|---|---|
| **Customer** | Opens the app in a mobile browser (or installs it to their home screen), creates an account, gets a personal QR code, views points balance/history, redeems rewards. |
| **Shop Owner / Staff** | Logs into a "staff" mode in the same app, scans customer QR codes using their phone's browser camera, and gives, redeems, or adjusts points. No permission tiers in v1 — any staff login can do all of this. |

Both roles live in **one Next.js app**, with a role-based view determined by login (customer login vs. staff login). No separate apps, no separate deployments.

## 5. Core Features

### 5.1 Customer Account
- Sign up with email + OTP (magic link) or Google OAuth, both handled by Supabase Auth and genuinely free. Phone OTP was considered but dropped — Supabase phone auth requires a paid third-party SMS provider (e.g. Twilio) billed per message, which breaks the $0-cost goal.
- Each account gets a unique, permanent QR code (encodes a customer ID, not raw personal data), rendered client-side (e.g., via a QR-generation library).
- Home screen: current points balance, recent transaction history, QR code display (large, screen-brightness friendly for easy scanning).
- "Add to Home Screen" prompt so the app behaves like a native app icon without going through an app store.

### 5.2 Checkout / Point Award Flow (Staff side)
1. Staff opens the "Scan Customer" page (requests camera access via the browser — `getUserMedia` — and decodes QR codes client-side with a JS library such as `html5-qrcode` or `zxing-js`). No external hardware.
2. Customer shows their in-app QR code.
3. Staff scans it → app resolves it to a customer profile (name, current balance shown for confirmation).
4. Staff manually enters the points to award (or purchase amount, with points auto-calculated from a configurable rule, e.g. 1 point per $10).
5. Staff confirms → a Next.js API route writes the transaction and updates the balance in Supabase; the customer's view updates (via Supabase Realtime or a refresh) to show the new balance.

### 5.3 Redemption / Adjustment Flow
- No formal rewards catalog in v1 — redemption is informal (e.g., customer asks to redeem points for something off-app, staff manually deducts points with a note describing what was redeemed).
- Staff scans the customer's QR, enters a negative point amount with a required note (`type = 'redeem'`).
- `adjustment` type covers manual corrections (e.g., staff mis-typed an amount) — same flow, required note explaining the reason.

### 5.4 Points Management (Owner)
- Configure earn rule if desired (e.g., points per currency spent, or flat points per visit) — informational for staff, not enforced by the system in v1.
- View basic reports: total points issued/redeemed, active customers, top customers.

### 5.5 Notifications
- In-app balance updates (via Supabase Realtime subscriptions) as the primary confirmation mechanism.
- Web push is a nice-to-have, not a dependency — iOS web push support is newer and less reliable than native push, so don't design the core flow around it.

## 6. Key Flows

### 6.1 Award Points (Sequence)
```
Customer          Staff (browser)         Next.js API Route         Supabase (Postgres)
   |  shows QR         |                         |                        |
   |------------------>|                         |                        |
   |                    | scan & decode QR (client-side)                  |
   |                    | POST /api/award-points  |                       |
   |                    |------------------------>|                       |
   |                    |                          | lookup customer, write transaction, update balance (single DB transaction)
   |                    |                          |----------------------->|
   |                    |                          |<-----------------------|
   |                    |<-------------------------|                       |
   |  balance updates (Realtime)                   |                       |
   |<------------------------------------------------------------------------|
```

### 6.2 Redeem / Adjust Points (Sequence)
Same scan step; staff enters a negative point amount and a required note (what was redeemed, or why a correction is needed). The API route validates the resulting balance won't go negative, writes the `transactions` row (`type = 'redeem'` or `'adjustment'`), and updates the cached balance — all inside one DB transaction.

## 7. Data Model

Relational schema (Postgres via Supabase) — chosen over NoSQL because foreign keys and transactional writes keep the points ledger consistent by default, which matters more here than raw scale (see Section 9 and Section 12 for the NoSQL comparison). Simplified for v1: no `role` on staff (any staff member can give/redeem/adjust points), no rewards catalog or redemptions table — redemption is just a `transactions` row with a negative amount and a note.

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL, -- primary login identifier (email OTP / Google OAuth)
  phone TEXT, -- optional, for reference/contact only, not used for login
  qr_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE, -- encoded in the QR code
  points_balance INT NOT NULL DEFAULT 0, -- cached, derived from transactions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- no role column: any staff login can give, redeem, and adjust points
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'adjustment')),
  points INT NOT NULL, -- positive for earn, negative for redeem/adjustment
  note TEXT, -- required for redeem/adjustment (what was redeemed, or why it was corrected)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`points_balance` on `customers` is a cached total, always derived from/reconcilable against the `transactions` ledger (source of truth = transactions, not the cached number) so balances can be audited or rebuilt if needed. Every award/redeem/adjustment must update `transactions` and `customers.points_balance` inside a single DB transaction — never as two separate writes.

## 8. Architecture & Tech Stack

**Final stack — optimized for $0/month cost and minimal deployment effort:**

- **App:** **Next.js**, deployed as a installable **PWA** (Progressive Web App) rather than a native app. One codebase, one deployment, serving both the customer-facing pages and the staff pages, with role-based views based on login type.
    - No App Store ($99/yr) or Play Store ($25 one-time) fees.
    - No app review process, no separate iOS/Android builds.
    - Customers just open a URL or tap "Add to Home Screen" for an app-like icon.
- **Hosting:** **Vercel** — built by the Next.js team, so Next.js's API routes and server-side features work natively with no extra configuration. Free tier comfortably covers this app's traffic (a shop with 500–5,000 customers doing occasional checkout scans). *(Netlify was also considered — viable, but less "native" for Next.js-specific features; no cost or benefit advantage here.)*
- **Database + Auth:** **Supabase** — free-tier Postgres database plus built-in authentication. Use **email OTP (magic link) and Google OAuth only** — both genuinely free. Phone OTP is available in Supabase but requires a paid third-party SMS provider billed per message, so it's excluded to keep costs at $0. Free tier supports up to 50,000 monthly active users — far beyond this app's scale.
- **QR scanning:** browser camera access (`getUserMedia`) + a client-side QR decoding library (e.g., `html5-qrcode` or `zxing-js`). Runs entirely in the browser — no external hardware, no native scanner.
- **QR code content:** encode only an opaque customer token/UUID (not personal data) so a photographed QR code can't leak information on its own.
- **Notifications:** in-app real-time balance updates via Supabase Realtime as the primary mechanism; web push as an optional enhancement (weaker/less consistent on iOS).

## 9. Non-Functional Requirements

- **Offline resilience:** browser connectivity can't be guaranteed at checkout — consider a lightweight retry/queue in the staff UI (e.g., hold the last scan+entry in local state and retry the API call) if the shop's Wi-Fi is unreliable. Full offline support is more limited in a PWA than a native app; treat this as best-effort, not a hard requirement, given the low-cost/low-effort goal.
- **Security:** QR tokens should be non-guessable (random UUID, not sequential IDs); staff actions logged with `staff_id` for accountability (no staff/owner permission split in v1 — see Section 7); rate-limit point-award API calls to prevent abuse; enforce customer-vs-staff access checks server-side in the API routes, backed by Supabase Row Level Security policies.
- **Scale:** 500–5,000 customers and their transaction history is a small dataset — a single free-tier Supabase Postgres instance handles this with plenty of room to spare; no special scaling work needed at this stage.
- **Simplicity for staff:** the scan-and-enter flow should be completable in under 10 seconds per customer, since it happens at checkout with a line potentially waiting.
- **Cost:** entire stack (Next.js + Vercel + Supabase) runs at $0/month at this scale — no paid tier required for hosting, database, or auth.

## 10. Future Enhancements (post-v1)

- Formal rewards catalog (named rewards with fixed point costs) if the shop wants structured redemption instead of free-text notes.
- Staff/owner permission split if the team grows and access needs to be restricted.
- Auto-calculate points from receipt/purchase amount instead of manual entry.
- Multi-location support if the shop expands.
- Tiered loyalty levels (bronze/silver/gold) with different earn rates.
- Referral bonuses.
- Basic analytics dashboard for the owner (repeat visit rate, redemption rate, etc.).
- Revisit native app / app store distribution if the shop ever wants a stronger brand presence — not needed for v1.

## 11. Open Questions

- Should staff be able to manually look up a customer without a QR scan (e.g., by name/email), for cases where a customer forgot their phone?
- Should there be a points expiry policy?
- Single staff login shared by all employees, or individual staff accounts for accountability?
- If a rewards catalog or staff/owner permission split turns out to be needed later, both can be added without breaking the current schema (see Section 10).

## 12. Appendix: SQL vs. NoSQL Consideration

A NoSQL option (e.g., Firebase Firestore) was considered as an alternative to Supabase/Postgres — also free at this scale, with real-time sync and built-in auth. It was set aside in favor of Postgres because:

- Foreign keys and `CHECK` constraints in Postgres prevent invalid data (e.g., a transaction referencing a nonexistent customer) automatically; Firestore requires this validation to be written by hand.
- The points ledger's atomicity requirement (a transaction write and a balance update must succeed or fail together) is Postgres's default behavior via `BEGIN...COMMIT`; in Firestore it requires deliberately using `runTransaction`.
- Reporting queries (e.g., "top customers this month") are simpler as SQL joins/aggregations than as Firestore collection queries.

Firestore remains a reasonable fallback if the team becomes more comfortable with that ecosystem, but Postgres is the lower-risk default for this data model.
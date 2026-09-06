# Loyalty Points App — Low-Level Design (LLD)

This document assumes the high-level design (`design-doc.md`) is settled: Next.js + Vercel + Supabase, three tables (`customers`, `staff`, `transactions`), no rewards catalog, no staff roles. This LLD defines the exact objects, API contracts, validation rules, and flows needed to implement it.

## 1. Objective (restated precisely)

A shop staff member, standing at a checkout with only their own phone, must be able to:
1. Identify a customer in under a few seconds (via QR scan).
2. Record a points change for that customer (`earn`, `redeem`, or `adjustment`).
3. Have that change reflected reliably — never lost, never double-counted, always attributable to which staff member made it and when.

A customer, on their own phone, must be able to:
1. Prove their identity at checkout (show their QR code).
2. See their current balance and history at any time.

Everything else (auth method, hosting, DB choice) exists to serve those two objectives as cheaply as possible. If any implementation detail below doesn't clearly serve one of these, it doesn't belong in v1.

## 2. Actors

| Actor | Can do |
|---|---|
| **Customer** (authenticated) | View own balance/history, view own QR code |
| **Staff** (authenticated) | Look up a customer by QR token, create transactions (earn/redeem/adjustment) for any customer |
| **Unauthenticated visitor** | Nothing — both customer and staff areas require login |

There is exactly one staff permission level. Any authenticated staff row can perform any staff action. (Flagged in the HLD as a v2 revisit if the shop hires more people and wants to restrict who can do what.)

## 3. Detailed Flows

### 3.1 Customer sign-up / login

**Preconditions:** none.
**Steps:**
1. Customer opens the app, chooses "Sign in with Google" or "Email link."
2. Supabase Auth handles the credential exchange; on first login, the app checks whether a `customers` row exists for this `auth.users.id`.
3. If not, create one: `INSERT INTO customers (name, email) VALUES (...)`, with `qr_token` and `points_balance` defaulting automatically.
4. Redirect to the customer home page.

**Edge cases:**
- Customer signs in with a *different* method (Google vs. email) using the same email address → Supabase treats these as separate identities unless linked; for v1, accept this as a known limitation (customer would end up with two accounts). Document it, don't solve it now.
- Customer's name isn't available from Google/email OTP by default → prompt for a display name on first login if missing.

### 3.2 Staff login

Same mechanism (Supabase Auth), but a separate `staff` table row is required to reach `/staff/*` routes. If an authenticated user has no matching `staff` row, redirect them to the customer area — they simply aren't staff.

**Provisioning staff accounts:** out of scope for self-service in v1. The shop owner adds staff rows directly (e.g., via the Supabase table editor) — no in-app "invite staff" flow needed at this scale.

### 3.3 Award / Redeem / Adjust points (the core flow)

**Preconditions:** staff is authenticated; customer has the app open with their QR visible.

| Step | Actor | Action | Failure mode & handling |
|---|---|---|---|
| 1 | Customer | Opens home page, QR code is rendered from `qr_token` | — |
| 2 | Staff | Opens `/staff/scan`, grants camera permission | Permission denied → show instructions to enable camera in browser settings |
| 3 | Staff | Points camera at customer's QR | No QR detected after ~10s → show "try repositioning" hint; no silent failure |
| 4 | Client | Decodes QR client-side → gets `qr_token` | Malformed/foreign QR (not from this app) → decode succeeds but lookup in step 5 returns 404 |
| 5 | Client | `GET /api/customers/by-token/{qr_token}` | 404 → "Customer not found — ask them to check they're logged into their account" |
| 6 | Staff | Reviews customer name + current balance shown on screen | This is the human fraud check — staff confirms it's the right person before proceeding |
| 7 | Staff | Selects type (`earn`/`redeem`/`adjustment`), enters points amount, enters note if required | Client-side: block submit if `redeem`/`adjustment` and note is empty |
| 8 | Client | `POST /api/transactions` with `{ customerId, type, points, note }` | See Section 4.2 for full validation |
| 9 | Server | Runs atomic write (Section 5) | On DB error, return 500, transaction is NOT partially applied (see Section 5) |
| 10 | Server | Returns new balance | — |
| 11 | Client (staff) | Shows confirmation with new balance | — |
| 12 | Client (customer) | Balance updates via Supabase Realtime subscription on their `customers` row | If customer's app is backgrounded, they'll see the update next time they open it — no push guarantee in v1 |

### 3.4 View balance / history (customer)

Simple read: `GET /api/transactions?customerId={self}` returns the authenticated customer's own transactions, most recent first, paginated (e.g. 20 at a time). RLS ensures a customer can only ever query their own rows (Section 6).

## 4. API Contracts

### 4.1 `GET /api/customers/by-token/{qr_token}`

**Auth:** staff only.

**Success (200):**
```json
{
  "id": "uuid",
  "name": "Jane Doe",
  "pointsBalance": 120
}
```

**Errors:**
- `401` — caller is not an authenticated staff member
- `404` — no customer with this `qr_token`

### 4.2 `POST /api/transactions`

**Auth:** staff only.

**Request:**
```json
{
  "customerId": "uuid",
  "type": "earn" | "redeem" | "adjustment",
  "points": 50,
  "note": "string, required if type is redeem or adjustment"
}
```

**Validation (server-side, in this order):**
1. `customerId` must reference an existing customer → else `404`.
2. `type` must be one of the three allowed values → else `400`.
3. `points` must be a positive integer (sign is decided by the server, not the client — see Section 5) → else `400`.
4. If `type` is `redeem` or `adjustment`, `note` must be a non-empty string → else `400` with message `"note is required for redeem and adjustment"`.
5. If `type` is `redeem`, the resulting balance must not go below zero → else `422` with message `"insufficient balance"`.

**Success (201):**
```json
{
  "transactionId": "uuid",
  "newBalance": 170
}
```

### 4.3 `GET /api/transactions?customerId={id}&cursor={cursor}`

**Auth:** customer (own data only, enforced via RLS) or staff (any customer).

**Success (200):**
```json
{
  "transactions": [
    { "id": "uuid", "type": "earn", "points": 50, "note": null, "staffId": "uuid", "createdAt": "2026-09-06T10:00:00Z" }
  ],
  "nextCursor": "uuid | null"
}
```

## 5. The Atomic Write (implementation detail)

This is the one piece of logic that must never be duplicated or bypassed. It lives in exactly one place: `lib/points.ts`, called only from `app/api/transactions/route.ts`.

**Postgres function (recommended over doing it in application code with two separate queries):**

```sql
CREATE OR REPLACE FUNCTION apply_transaction(
  p_customer_id UUID,
  p_staff_id UUID,
  p_type TEXT,
  p_points INT,       -- always positive, magnitude only
  p_note TEXT
) RETURNS TABLE(transaction_id UUID, new_balance INT) AS $$
DECLARE
  v_signed_points INT;
  v_new_balance INT;
  v_transaction_id UUID;
BEGIN
  v_signed_points := CASE WHEN p_type = 'earn' THEN p_points ELSE -p_points END;

  SELECT points_balance + v_signed_points INTO v_new_balance
  FROM customers WHERE id = p_customer_id FOR UPDATE; -- row lock prevents concurrent double-award

  IF p_type = 'redeem' AND v_new_balance < 0 THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  INSERT INTO transactions (customer_id, staff_id, type, points, note)
  VALUES (p_customer_id, p_staff_id, p_type, v_signed_points, p_note)
  RETURNING id INTO v_transaction_id;

  UPDATE customers SET points_balance = v_new_balance WHERE id = p_customer_id;

  RETURN QUERY SELECT v_transaction_id, v_new_balance;
END;
$$ LANGUAGE plpgsql;
```

Calling this as a single `SELECT apply_transaction(...)` from the API route guarantees Postgres treats the balance check, the insert, and the update as one transaction — no window where a crash leaves the ledger and the cached balance out of sync. `FOR UPDATE` also prevents the race where two staff members scan the same customer at the same instant and both reads see the pre-update balance.

## 6. Security (Row Level Security policies)

```sql
-- Customers can only read their own row and their own transactions
CREATE POLICY customer_read_own ON customers
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY customer_read_own_transactions ON transactions
  FOR SELECT USING (auth.uid() = customer_id);

-- Only staff (checked via a helper function against the staff table) can write transactions
CREATE POLICY staff_write_transactions ON transactions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()));

-- Only staff can read arbitrary customer rows (for the scan lookup)
CREATE POLICY staff_read_any_customer ON customers
  FOR SELECT USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()));
```

Direct table writes to `transactions`/`customers` from the client are never allowed for the point-changing path — the client always goes through the API route, which calls `apply_transaction`. RLS above is the backstop, not the primary mechanism.

## 7. Edge Cases & Open Decisions

| Case | Current decision | Notes |
|---|---|---|
| Two staff scan the same customer within milliseconds | Handled by `FOR UPDATE` row lock — second call waits, sees updated balance | |
| Staff enters points for the wrong customer | No undo button in v1 — staff creates an `adjustment` to correct it | Matches Section 3.3 in HLD |
| Customer has no camera-visible QR (phone dead, etc.) | Not supported in v1 | Open question carried from HLD Section 11 — manual lookup by name/email is a candidate v2 feature |
| Redeem would take balance negative | Rejected with `422` | See Section 4.2 |
| Customer deletes their account | Out of scope for v1 — no delete flow defined yet | Needs a decision: keep transaction history for shop records, or cascade delete? |

## 8. What's Deliberately Not Here

- No rewards catalog, no `reward_id` anywhere — confirmed removed in the HLD discussion.
- No staff roles/permissions — any staff row can do anything.
- No push notifications as a dependency — Realtime subscription is the only "live update" mechanism assumed to exist.
- No offline queue in v1 (flagged as best-effort in the HLD, not built out here) — if the network drops mid-scan, the staff UI should show a clear error and let staff retry, not silently fail.

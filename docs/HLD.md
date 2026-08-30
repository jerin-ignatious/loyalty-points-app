# Loyalty Points App — Design Doc

## 1. Summary

A native mobile app that lets a small shop run a customer loyalty points program without buying any dedicated QR/barcode scanner hardware. Each customer has an account with a personal QR code inside the app. At checkout, the customer shows their QR code, the shop owner scans it using their own phone's camera (software scanning — no extra hardware), and then manually enters the number of points to award for that purchase.

## 2. Goals

- Give every customer a persistent points account tied to their identity.
- Let the shop owner identify a customer instantly at checkout via QR code, without typing a phone number or searching a list.
- Let the shop owner award points manually (since points are usually tied to purchase amount, not scanned items).
- Keep hardware cost at zero — everything runs on phones the shop and customers already own.
- Support 500–5,000 customers comfortably.

## 3. Non-Goals (v1)

- No item-level barcode scanning or POS/inventory integration.
- No multi-location / franchise support (single shop only, can revisit later).
- No payment processing — this is points only, not a payment app.

## 4. Users & Roles

| Role | Description |
|---|---|
| **Customer** | Downloads the app, creates an account, gets a personal QR code, views points balance/history, redeems rewards. |
| **Shop Owner / Staff** | Logs into a "merchant" role (same app, different mode, or a companion app), scans customer QR codes, manually enters/adjusts points, manages reward rules. |

Two roles can live in **one app** with a toggle/login mode, or as **two apps sharing one backend** (customer app + staff app). Recommendation: one app, two modes — simpler to build and distribute for a small shop with 1–2 staff members. See Section 8.

## 5. Core Features

### 5.1 Customer Account
- Sign up with phone number or email + OTP (avoid passwords for a low-friction small-shop audience).
- Each account gets a unique, permanent QR code (encodes a customer ID, not raw personal data).
- Home screen: current points balance, recent transaction history, QR code display (large, screen-brightness auto-boosted for easy scanning).

### 5.2 Checkout / Point Award Flow (Staff side)
1. Staff opens "Scan Customer" screen (uses phone camera + on-device QR decoding library — no external hardware).
2. Customer shows their in-app QR code.
3. Staff scans it → app resolves it to a customer profile (name, current balance shown for confirmation).
4. Staff manually enters the points to award (or purchase amount, with points auto-calculated from a configurable rule, e.g. 1 point per $10).
5. Staff confirms → points are added, a transaction record is created, customer sees an instant update (push notification) and updated balance.

### 5.3 Redemption Flow
- Customer requests redemption in-app (or asks staff in person).
- Staff scans QR again, sees available rewards customer can redeem, confirms redemption → points deducted, reward marked as redeemed.

### 5.4 Points & Rewards Management (Owner)
- Configure earn rule (e.g., points per currency spent, or flat points per visit).
- Configure rewards catalog (e.g., "100 pts = free coffee").
- View basic reports: total points issued/redeemed, active customers, top customers.

### 5.5 Notifications
- Push notification to customer when points are awarded or redeemed.
- Optional: reminder notifications for near-expiry points or unused rewards.

## 6. Key Flows

### 6.1 Award Points (Sequence)
```
Customer          Staff App              Backend
   |  shows QR         |                     |
   |------------------>|                     |
   |                    | scan & decode QR    |
   |                    |-------------------->| lookup customer by ID
   |                    |<--------------------| customer profile + balance
   |                    | staff enters points  |
   |                    |-------------------->| create transaction, update balance
   |                    |<--------------------| success + new balance
   |  push notification |                     |
   |<--------------------------------------------|
```

### 6.2 Redeem Reward (Sequence)
Same scan step, then staff selects a reward the customer qualifies for; backend validates balance ≥ reward cost, deducts points, logs redemption.

## 7. Data Model (high level)

**Customer**
- id (UUID), name, phone/email, qr_code_token, points_balance, created_at

**Staff / Merchant User**
- id, name, login credentials, role (owner/staff)

**Transaction**
- id, customer_id, type (earn/redeem/adjustment), points, staff_id, note, created_at

**Reward**
- id, name, points_cost, active (bool)

**Redemption**
- id, customer_id, reward_id, staff_id, created_at

Keep `points_balance` on the customer record as a cached total, always derived from/reconcilable against the transaction ledger (source of truth = transactions, not the cached number) so balances can be audited or rebuilt if needed.

## 8. Architecture & Tech Stack

**Recommended approach for a small shop, 500–5,000 customers:**

- **Mobile app:** React Native or Flutter — one codebase for iOS + Android, with a role-based mode switch (Customer view vs Staff view) tied to login type. Cheaper to build/maintain than two separate native apps.
- **QR scanning:** on-device camera + a standard QR decoding library (e.g., `react-native-vision-camera` + `vision-camera-code-scanner`, or Flutter's `mobile_scanner`). No external hardware needed — this satisfies the "no scanner" constraint directly.
- **Backend:** a REST API built with **Java + Spring Boot**, backed by a managed **PostgreSQL** database. Spring Data JPA covers the data layer (customer, transaction, reward, redemption entities), and Spring Security handles role-based access for customer vs. staff vs. owner. At this customer scale (500–5,000 customers), a single small server instance is more than sufficient — no need for complex infrastructure. Spring's transaction management (`@Transactional`) is a natural fit for keeping the points ledger consistent — every balance change should go through a single service method that writes the transaction record and updates the cached balance atomically.
- **Auth:** phone/email + OTP for customers; email/password (or PIN) for staff, with roles enforced server-side.
- **Push notifications:** standard FCM (Android) / APNs (iOS) via the mobile framework's notification library.
- **QR code content:** encode only an opaque customer token/ID (not personal data) so a photographed QR code can't leak information on its own.

## 9. Non-Functional Requirements

- **Offline resilience:** if the shop has poor connectivity, allow the staff app to queue a scanned award/redemption locally and sync once online (important for a small shop that may not have great Wi-Fi).
- **Security:** QR tokens should be non-guessable (random UUID, not sequential IDs); staff actions logged with staff_id for accountability; rate-limit point-award actions to prevent abuse.
- **Scale:** 500–5,000 customers and their transaction history is a small dataset — a single managed Postgres instance handles this with room to spare; no special scaling work needed at this stage.
- **Simplicity for staff:** the scan-and-enter flow should be completable in under 10 seconds per customer, since it happens at checkout with a line potentially waiting.

## 10. Future Enhancements (post-v1)

- Auto-calculate points from receipt/purchase amount instead of manual entry.
- Multi-location support if the shop expands.
- Tiered loyalty levels (bronze/silver/gold) with different earn rates.
- Referral bonuses.
- Basic analytics dashboard for the owner (repeat visit rate, redemption rate, etc.).

## 11. Open Questions

- Should staff be able to manually look up a customer without a QR scan (e.g., by phone number), for cases where a customer forgot their phone?
- Should there be a points expiry policy?
- Single staff app login shared by all employees, or individual staff accounts for accountability?
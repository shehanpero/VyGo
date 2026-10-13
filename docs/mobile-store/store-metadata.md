# VyGo — Google Play Store Metadata Pack

**Developer**: Perovin · **App**: VyGo — Sri Lanka bus & coach ticketing
**Prepared for**: Play release listing · **Language**: English (en-001)
**Date**: 2026-08-07

Grounding: verified against `frontend/src/pages/*`, `main.jsx` route map, `docs/ux-research.md`,
`docs/design-system.md`, `ExpresswayCorridors.jsx`, and the marketing copy in `about.php/features.php`.
This file is the single source of truth for Play metadata; copy blocks are duplicated verbatim in
`google-play-listing.md` for one-click pasting.

---

## 1. Recommended app names (≤30 characters)

| Rank | App name                            | Length | Rationale |
|------|-------------------------------------|--------|-----------|
| **Primary** | **VyGo – Bus Booking Sri Lanka** | 28 | Brand-first, geo keyword "Sri Lanka", category keyword "Bus", action keyword "Booking". Reads cleanly in Search and on the shelf. |
| 2   | VyGo – Sri Lanka Bus Tickets        | 27 | Shorter signal density; weaker on the booking/search action intent. |
| 3   | VyGo Bus & Coach Booking            | 24 | International "coach" synonym broadens reach but dilutes the Sri Lanka local signal. |

> **Primary name chosen: `VyGo – Bus Booking Sri Lanka`**

Play limit: 30 chars. Never change the brand token `VyGo`; keep the geographic term at the tail so
brand recognition survives truncation on small screens.

---

## 2. Short description (max 80 characters)

> **Book Sri Lanka bus tickets. Pick your seat, pay safe, board with QR.**

60 chars. Fits inside Play's 80-char short-description window even after localization expansion.
Covers the full funnel: search → pick → pay → QR board (matches the app's actual `Home.jsx` promise:
"Compare fares, pick your seat, pay safely and board with a QR ticket").

---

## 3. Long description (Google Play, 4000 char limit / 2.8–3.5k sweet spot)

~2,950 chars below. Structure: hook first, value stack, corridors, seat selection, payment/trust,
tickets, people it serves, AI helper, closing CTA.

```
VyGo – Book seats on Sri Lanka's expressway and long-distance buses. Compare live fares and
timetables from SLTB and private operators in one place, reserve your exact seat, pay securely,
and get a QR e-ticket that is all you need to board. No queues, no cash on the bus.

SEARCH THE ISLAND'S ROUTES
Start with two city names and a date. VyGo searches live departures across Colombo, Kandy, Galle,
Matara, Jaffna, Trincomalee, Katunayake and beyond — including the E03 Colombo–Katunayake Airport
corridor and the E01 Southern Expressway connecting Colombo and Makumbura to Kataragama, Tangalle
and the deep south. Filter by bus type (AC, Luxury, Semi Luxury or Normal), sort by departure
time or fare, and switch between "All routes" and "Expressway only" with a single tap.

CHOOSE YOUR EXACT SEAT ON A 3D BUS
VyGo lets you look inside the actual coach. Walk the aisle in a 3D model of the bus you are about
to ride — front, back, window or aisle seat — or switch to the simple 2D map. Seats already taken
are marked, the seats you choose are locked while you pay, and the price per seat appears before
you commit.

PAY SAFELY WITH PAYHERE
Check out with your card through PayHere, Sri Lanka's leading payment gateway. Your seats are
locked the moment you confirm and you get an instant booking reference — no waiting for a
counter, no confusion at the depot.

RIDE WITH A QR E-TICKET
Your ticket is a smartphone QR that the conductor verifies when you board — no printer, no paper.
Keep every booking in one place: itineraries, seat numbers, boarding points and refunds as the
trip evolves. Cancel and claim refunds under the fare rules shown at booking.

FOR EVERY TYPE OF TRAVELLER
Daily commuters, weekend travellers, pilgrims heading to Kataragama and travellers flying in and
out of Colombo. Classic numbered routes run alongside modern private express services, and every
trip shows the operator identity — so you can book a government SLTB bus or a rated private coach
with confidence before you pay.

ASK VYGO FOR TRIP PLANNING
Not sure about the quickest route? Ask the built-in assistant: "E01 Colombo to Matara", "Which bus
goes to Kataragama?" or "Expressway or normal road?". It replies with real trip suggestions and
links you straight into search — a route planner in your pocket.

LIVE SCHEDULES AND YOUR INBOX
Create a free account to keep every journey in one place. Follow operators and live timetables,
get notified before departure, and receive payment confirmations and cancellation updates in
your inbox — so nothing falls through the gap after you lock a seat.

WHY YOU'LL LIKE VYGO
- No queues or ticket windows — book end to end on your phone.
- Real-time seat availability, not estimates.
- Manage bookings, cancellations, refunds and alerts from one inbox.
- Built in Sri Lanka for Sri Lankan road travel.

Download VyGo now. Pick a corridor, pick a seat, and be at the gate before the bus pulls in.
<!-- The above copy is ~2.9k chars. Keep the "Why VyGo" bullet block at the end; Play ranks the top
lines heaviest, so the hook owns the keywords "bus", "tickets", "Sri Lanka". -->

### Keyword density check (top 4 lines)
"tickets", "Sri Lanka", "bus", "expressway", "intercity", "seat", "QR", "PayHere" ✓
Avoid stacking the same keyword more than twice in the first three lines.

---

## 4. Category & maturity

| Field | Recommendation | Notes |
|-------|----------------|-------|
| **Primary category** | **Travel & Local** | The standard "home" for transit/booking apps. Highest user intent for "bus tickets" findability. |
| **Secondary / alternate category** | Travel & Local → "Travel" (App Store analog) or "Transportation tickets" where available | Google Play exposes one primary category; local aliases vary by storefront. Never file under Gaming/Entertainment — Play algorithm penalizes miscategory. |
| **Tags (developer-set, if supported)** | `travel`, `transportation`, `tickets`, `public_transport` | Some regional consoles accept custom tags. |

**Play Content Maturity**: `Everyone` (IARC-based questionnaire). Justification:
- App is a ticket booking utility. Zero sexual, gambling, drug, violent, or UGC-generated content.
- Payments exist (PayHere) but payments do not, by themselves, raise the maturity rating; IARC
  only flags payments when tied to gambling/betting or sexual/harmful goods. The questionnaire
  must answer "no" to: alcohol, tobacco, simulated gambling, lotteries, engagement with minors.
- If any future UGC (reviews on operator pages) adds user discourse, re-run the IARC survey and
  stay within `Everyone` unless comments become abusive — then reconsider `Everyone 10+`.

**Audience / general rating**: `Everyone` (all ages). No profanity, no medical/health claims, no real-
money gambling. Default store audience = Everyone. The app does collect personal data — keep parental
control note only if Play flags it.

---

## 5. Keyword list (30)

| # | Keyword               | Intent | # | Keyword               | Intent |
|---|----------------------|--------|---|----------------------|--------|
| 1  | bus tickets          | traffic | 16 | private bus           | niche  |
| 2  | bus booking          | traffic | 17 | book a seat           | action |
| 3  | Sri Lanka            | named   | 18 | seat selection        | action |
| 4  | coach tickets        | high   | 19 | PayHere               | brand  |
| 5  | expressway           | niche   | 20 | SLTB                  | brand  |
| 6  | intercity bus        | high    | 21 | travel app        | generic|
| 7  | ticket app           | generic | 22 | Colombo Kandy         | local  |
| 8  | bus routes Sri Lanka | niche   | 23 | Colombo Galle | local  |
| 9  | bus reservation      | high    | 24 | Colombo Jaffna        | local  |
| 10 | airport bus          | vehicle  | 25 | Katunayake | local  |
| 11 | luxury bus           | class   | 26 | to Katunayake         | local  |
| 12 | AC bus               | class   | 27 | QR ticket booking     | action |
| 13 | normal bus           | class  | 28 | online bus reservation| high   |
| 14 | government bus       | trust   | 29 | pilgrim travel        | niche  |
| 15 | private bus          | trust   | 30 | bus schedule          | info   |

**Target buckets**: high-traffic (1–3,5–6,9,28), class (11–13,16–17, 28), local (22–26) and trust
(14–15,20) to sweep discovery while ranking cost stays sane. Group "Sri Lanka" is unavoidably
name-level; do not waste space duplicating it in the long description repeatedly.

---

## 6. Title + ASO strength note

**Rated: SS (Strong) — recommended primary holds it.**

- **Length**: 28/30 chars — keeps Search Store signal, no truncation, no "…" in dense surfaces.
- **Keyword positioning**: brand "VyGo" carries identity; "Bus Booking" is the product verb-noun most
  travellers type; "Sri Lanka" localizes and blocks; the term "ticket" is left in the short desc
  to widen tail-match without bloating the title.
- **Tone/legibility**: no exclamation, no caps-overload, correct en-001 English, no emoji.
- **Audio branding**: Google Play's title field doubles as the Android launcher label — "VyGo – Bus
  Booking Sri Lanka" is compact enough to render as a single line on the home screen.
- **Risk**: "Bus Booking" is also the category term, so competitors own it; we differentiate with
  geo + brand. If a UGC surge happens, consider localizing the title per-market (Sinhala/Tamil)
  while keeping the Latin brand in the metadata field.
- **Caveat**: Google Play reserves the right to reject bait-and-switch titles. We're compliant (title =
  actual app). Do not append "free" or "official" to the name.

---

## 7. Historical / promotional graphic notes + Play policy reminders (for developers)

### 7.1 Required store graphics (beyond icon)

| Asset | Size (px) | Your current status |
|-------|-----------|----------------------|
| App icon           | 512×512   | ✓ `images/icon-512.png` (generated from `assets/vygoicon.png`) |
| Feature graphic    | 1024×500  | **TODO** — brand/logo on the LEFT, key visual on the RIGHT; do not simulate a screenshot |
| Phone screenshots  | 1080×1920 (min) → up to 8        | See `screen-spec.md` (7 planned slices) |
| TV banner (optional until TV release) | 320×180 | Not needed on phone-only launch |

**Legacy** (historical, no longer required by Play): 180×120 promo graphic, 1280×720 preview —
retired. Do not use the old "10 images + 1024x500" era templates.

### 7.2 Play policy checklist (before release)

1. **Privacy Policy URL** — REQUIRED field in Play Console. Placeholder:
   `https://vygo.lk/privacy` (developer: publish a page stating what's collected: name, email, phone,
   travel identity, device/payment via PayHere provider; contact + deletion email; data retention
   for bookings).
2. **Data Safety form** — declare: collects device/other IDs (account), personal info (name, email,
   phone), and payment/transaction info (processed by PayHere as a 3rd party, not stored). Mark:
   encrypted in transit, not sold, option to delete account.
3. **Permissions** — request is minimal. The Android build auto-bundles INTERNET (fetch + API);
   avoid AD_ID without consent (PayHere SDK may include it; check SDK manifest and fill the Data
   Safety accordingly).
4. **Ads** — none configured; declare "No ads" in the Data Safety form.
5. **Rating (IARC toolkit)** — run the questionnaire; our analyst answers: no violence/sexual/drug/
   gambling → `Everyone`.
6. **Content rating form** — mention "User Reviews" if you turn on app UGC → keep age gate to deny
   minors posting (or disable UGC at launch).
7. **New APIs** (SDK) — test the release with Play's testing tools; ensure no SMS/CallLogs
   permissions are bundled by the PayHere SDK for unrelated reasons.
8. **Remove test/demo** — verify no "sandbox"/"dev" copy in the shipped build. The payment flow in
   the dev build currently shows "Confirm payment (dev)" to real passengers (`Payment.jsx`); fix
   before release.
9. **Verify identity / "Developer Contact Details"** — fill: country-registered developer Perovin,
   support email, phone, website.

### 7.3 Monetization notes
- The app is a ticketing intermediary: every transaction is a "user pay" fare, not an ad. Keep the
  store page focused on the ticket UI — not an ad surface. No interstitials between screens.
- If you collect a booking fee + VAT, label it in the UI as booking fee + tax (Play's fees policies).

---

## 8. Audience / ratings

**Recommended target rating**: `Everyone` (Play) / `Everyone 10+` only if future review content becomes
problematic.

Rationale:
- No violence, mature content, or gambling.
- The in-app financial payment is disclosed and handled by a PCI-compliant partner (PayHere); it does
  not push the rating higher by itself.
- A travel utility for pilgrims, commuters, and families = "Everyone" maximizes sampling and
  local installs.

After launch, keep an eye on store ratings; collect reviews at journey completion to grow the
volume of positive installs (aim: ≥4.4 stars).

---

## 9. Localization (future)

- Sinhala (si) and Tamil (ta) store pages will double readable reach on Sri Lanka; keywords should
  be re-plumbed per language ("bus tickets" = "බස් ටිකට්").
- Keep brand "VyGo" invariant; localize only short/long descriptions.
- en-001 base confirms the United States English locale.

---

*Metadata authored 2026-08-07 · Method: RESIZE_SOURCE for icons (source 1200×1200 kept ARGB, downgraded 32-bit for Play output).*
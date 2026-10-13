# VyGo — Ready-to-Paste Google Play Listing

Use this page to fill the Play Console fields. Copy each section verbatim into the matching form
field. Field names in **BOLD** map to Play Console labels.

---

## Store listing form (Quick > APP CONTENT & more)

### **App name** (max 30 chars)
```
VyGo – Bus Booking Sri Lanka
```

### **Short description** (max 80 chars)
```
Book Sri Lanka bus tickets. Pick your seat, pay safe, board with QR.
```

### **Full description** (max 4000 chars)
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
```

> Pasting note: the em-dashes (–) and apostrophes (') are plain Unicode; keep them Unicode when
> pasting into Play Console. Do not convert to HTML entities — the console renders Unicode directly.

---

### **CATEGORY & language**
| Field | Value |
|-------|-------|
| App type | Application |
| Default language | English (en-US / en-001) |
| Primary category | **Travel & Local** |
| Secondary shown when available | "Travel" / "Transportation tickets" |
| Content rating | Everyone (see Data Safety below) |
| Ads | No ads |

### **Contact details (DEVELOPER SETTINGS)**
| Field | Value (placeholders) |
|-------|----------------------|
| Developer name | Perovin |
| Developer website | https://vygo.lk |
| Support email | support@vygo.lk |
| Support website | https://vygo.lk/help |
| Privacy policy URL | **https://vygo.lk/privacy** ← REQUIRED; publisher must host |
| Data deletion URL | https://vygo.lk/account/delete (or documented in-app deletion path) |

### **Privacy policy placeholder text** (add to your policies page)
```
VyGo ("we", "us") processes personal data to operate a Sri Lanka bus-ticketing service. We collect:
- Account identity: name, email, mobile phone,
- Travel history: bookings created, seat numbers, boarding/drop-off points,
- Payment: transaction details processed by our payment partner PayHere (we do not store your
  full card number).
We do not sell personal data. Delete your account at any time via the account deletion feature.
For questions contact support@vygo.lk.
```
- Play Data Safety checklist: declare `Personal info (name, email, phone)`, `Financial info
  (transaction)` via PayHere, `App info` (account), `Device or other IDs`. Choose `No ads`,
  `Data not sold`, and enable the Data deletion control to satisfy Play's requirement.

### **IARC / rating inputs** (answer during review)
No violence · No mature/Sexual · No illegal/restricted goods · No gambling · No user digital
content · No substance references. Payment in-app is standard e-commerce and is not a rating
factor → **Everyone**.

---

### **Graphic assets to attach**

| Name | Spec | Ready? |
|------|------|--------|
| App icon | 512×512 PNG | ✓ `images/icon-512.png` |
| Feature graphic | 1024×500 PNG | ⚠️ TODO (brand mark left, keep right 1/3 blank) |
| Phone screenshots (7) | PNG min 1080×1920 (we capture 1080×2320) | ⚠️ from `screen-spec.md` |
| TV banner | 320×180 | Not required for phone-only |

Include max 8 screenshots; use the 7 from `screen-spec.md` in order given.

---

### **PROMO / promotional text** (Play's promotional text field, when offered)
```
Skip the queue, Sri Lankan style — compare SLTB and private operators, pick a seat in 3D, pay
with PayHere and board with a QR e-ticket. VyGo: built in Sri Lanka for Sri Lankan road travel.
```

---

## Copy the version notes boilerplate (release notes)

```
What's new:
- First release (v1.0.0): Book expressway and classic bus seats across Sri Lanka with live fares,
  2D/3D seat maps, PayHere payment and QR e-tickets.
- Bookings, cancellations and refunds from one account inbox.
```

---

## Final publisher checklist (gated before publish)

- [ ] Host and link the Privacy Policy URL (placeholder → real)
- [ ] Fill Data Safety form (no ads, encrypted, no sale)
- [ ] Run IARC questionnaire → set Everyone
- [ ] Confirm no "dev/sandbox/demo" strings in the mobile release
- [ ] Attach final 512 icon + feature graphic
- [ ] Review the 7 screenshots for smudged locale text (English default)
- [ ] Set up release track (internal test → closed → production)
- [ ] Distribute to a few testers and get a ratings baseline before the production rollout

---

*Rendered 2026-08-07 · Companion assets: `images/icon-512.png`, `images/icon-192.png`,
`images/icon-1024.png`, `make-icons.ps1`, `store-metadata.md`, `screen-spec.md`, `feature-bullets.md`.*
# Assistant Citations — Engineering Design

Status: Design spec (draft v1)
Applies to: `POST /api/v1/assistant/chat` response (`com.vygo.dto.assistant.AssistantResponse`)
Owners: backend (AssistantService / DTO), frontend (AiAssistant rendering), content (llms.txt as the canonical fact sheet)

## 1. Goal

Make every data-backed answer from the VyGo Assistant grounded and traceable. Today the assistant
emits plain text such as `• 06:00–09:30 · AC · Lanka Express · LKR 1500.00 · 45 seats`, and the user
has no way to verify the number came from a real trip, a fare rule, or a seeded fact. This design
adds an optional `citations` array to the assistant response so the frontend can render small
"source" chips under the reply and users (and future AI agents calling this endpoint) can trace each
claim to a stable identifier.

This is a design + content task only. No backend Java or frontend React source is modified here;
this file is the specification the orchestrator hands to the parallel engineering agents.

## 2. Proposed API change

Add one optional field to the `AssistantResponse` record:

- Field: `citations`
- Type: array of citation objects
- Default when absent: `[]` (empty array)
- Backward compatibility: the response keeps the existing three fields `reply`, `suggestions`,
  `action` unchanged. Clients that ignore unknown fields keep working; new clients may read
  `citations`.

Citation object shape:

```json
{
  "label": "Human-readable claim, as shown to the user",
  "source": "trip-search | booking | fare-rule | route | faq-factsheet",
  "ref": "Stable identifier for the data backing this claim"
}
```

- `source` is restricted to the enum: `trip-search`, `booking`, `fare-rule`, `route`,
  `faq-factsheet`.
- `ref` is a stable, codebase-derived identifier:
  - trip-search → `tripId` (numeric string, e.g. `"101"`)
  - booking → `bookingRef` (e.g. `"DEMO-VY-20260802-A7B3"`)
  - fare-rule → `"route{routeId}+{busType}"` (e.g. `"route3+AC"`)
  - route → `"catalogue"` (the whole seeded route catalogue) or `"route{routeId}"` for one route
  - faq-factsheet → the llms.txt section key (e.g. `"cancellation-policy"`, `"seat-lock"`)

`label` should mirror the text that appears in `reply` so the chip visually matches the claim.

## 3. Exact JSON Schema

The schema below describes the full assistant response once the change lands. `citations` is the
only addition.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "AssistantResponse",
  "type": "object",
  "required": ["reply", "suggestions", "action"],
  "properties": {
    "reply": { "type": "string" },
    "suggestions": {
      "type": "array",
      "items": { "type": "string" }
    },
    "action": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": { "type": "string", "enum": ["none", "search", "navigate"] },
        "data": { "type": "object" }
      }
    },
    "citations": {
      "type": "array",
      "default": [],
      "items": {
        "type": "object",
        "required": ["label", "source", "ref"],
        "properties": {
          "label": { "type": "string" },
          "source": {
            "type": "string",
            "enum": ["trip-search", "booking", "fare-rule", "route", "faq-factsheet"]
          },
          "ref": { "type": "string" }
        }
      }
    }
  }
}
```

## 4. Example responses

### 4.1 "bus from Colombo to Kandy tomorrow" (search intent)

Grounding note: the assistant always searches `LocalDate.now()` — there is no date-parsing today, so
"tomorrow" returns today's trips. Every listed trip carries a `trip-search` citation; because the
reply prints fares, each trip also carries a `fare-rule` citation. The seeded demo booking (seats
1–2 on the 14:30 LUXURY trip) makes that trip show 43 available seats vs 45/58 on the untouched
trips. `tripId` values are DB-generated; the ones below are illustrative.

```json
{
  "reply": "I found 3 trips on Colombo → Kandy today:\n• 06:00–09:30 · AC · Lanka Express · LKR 1500.00 · 45 seats\n• 11:30–15:00 · NORMAL · Lanka Express · LKR 650.00 · 58 seats\n• 14:30–18:00 · LUXURY · Lanka Express · LKR 1200.00 · 43 seats\nTap below to see all results and pick your seat.",
  "suggestions": ["Show me", "Refund policy", "Payment methods"],
  "action": {
    "type": "search",
    "data": { "from": "Colombo", "to": "Kandy", "date": "2026-08-02" }
  },
  "citations": [
    {
      "label": "Colombo→Kandy · 06:00 · AC · LKR 1500",
      "source": "trip-search",
      "ref": "101"
    },
    {
      "label": "Fare rule route1+AC",
      "source": "fare-rule",
      "ref": "route1+AC"
    },
    {
      "label": "Colombo→Kandy · 11:30 · NORMAL · LKR 650",
      "source": "trip-search",
      "ref": "102"
    },
    {
      "label": "Fare rule route1+NORMAL",
      "source": "fare-rule",
      "ref": "route1+NORMAL"
    },
    {
      "label": "Colombo→Kandy · 14:30 · LUXURY · LKR 1200",
      "source": "trip-search",
      "ref": "103"
    },
    {
      "label": "Fare rule route1+LUXURY",
      "source": "fare-rule",
      "ref": "route1+LUXURY"
    }
  ]
}
```

### 4.2 "show my bookings" — guest (anonymous)

No booking data is computed for a guest, so the bookings list carries zero `booking` citations. The
one seeded fact referenced in the reply (the demo account) may be cited from the fact sheet.

```json
{
  "reply": "Sign in to see your bookings. Use the demo account nimal@vygo.lk (password password123).",
  "suggestions": ["Go to login", "Book a bus"],
  "action": {
    "type": "navigate",
    "data": { "path": "/login" }
  },
  "citations": [
    {
      "label": "Demo accounts (llms.txt)",
      "source": "faq-factsheet",
      "ref": "demo-accounts"
    }
  ]
}
```

### 4.3 "show my bookings" — signed-in passenger (nimal@vygo.lk)

The seeded booking `DEMO-VY-<date>-<hex>` appears; each listed booking gets a `booking` citation.

```json
{
  "reply": "You have 1 booking:\n• DEMO-VY-20260802-A7B3 · CONFIRMED · LKR 2400\nOpen My Bookings for details and your e-tickets.",
  "suggestions": ["View my e-tickets", "Cancel a booking", "Book a new trip"],
  "action": {
    "type": "navigate",
    "data": { "path": "/bookings" }
  },
  "citations": [
    {
      "label": "DEMO-VY-20260802-A7B3 · CONFIRMED · LKR 2400",
      "source": "booking",
      "ref": "DEMO-VY-20260802-A7B3"
    }
  ]
}
```

## 5. Intents that MUST carry citations

| Intent / trigger | Citations emitted | source | ref |
|---|---|---|---|
| search (e.g. "bus from Colombo to Kandy") | one per listed trip, up to the 3 shown | `trip-search` | `tripId` |
| search (same reply, fare is asserted) | one per listed trip with a fare | `fare-rule` | `route{routeId}+{busType}` |
| fare / cheapest ("how much is the fare", "cheapest") | the fare source for the computed value | `fare-rule` | `route{routeId}+{busType}` |
| bookings ("show my bookings") — signed in | one per listed booking | `booking` | `bookingRef` |
| bookings — guest | none for bookings (may cite demo-accounts fact) | `faq-factsheet` | `demo-accounts` |
| routes ("routes", "where can i go") | the route catalogue claim | `route` | `catalogue` |
| cancellation / refund FAQ | the policy fact | `faq-factsheet` | `cancellation-policy` |
| seat-lock FAQ | the lock fact | `faq-factsheet` | `seat-lock` |
| payment / PayHere FAQ | the sandbox fact | `faq-factsheet` | `payment-sandbox` |
| QR e-ticket FAQ | the boarding fact | `faq-factsheet` | `qr-e-ticket` |
| expressway FAQ | the expressway fact | `faq-factsheet` | `expressway-services` |
| login / demo accounts FAQ | the demo-accounts fact | `faq-factsheet` | `demo-accounts` |
| operator / conductor / alerts FAQ | the matching llms.txt section | `faq-factsheet` | section key |

The `ref` for FAQ facts is exactly the llms.txt section header key, so
`frontend/public/llms.txt` becomes the canonical, human-readable fact sheet that agents and users
can open to verify the claim.

### Correction the citation work exposes

`AssistantService.routes()` currently replies "We serve 130+ routes … E01, E02 and E03" and the
LLM `SYSTEM_PROMPT` repeats E01/E02/E03. The seeded catalogue is 111 routes and only E001 has seed
data. While wiring citations, the routes reply must be corrected to "111 routes across Sri Lanka,
including expressway services on E001" and carry `source=route, ref=catalogue`. The LLM system
prompt should be updated to say E001 only.

## 6. Grounding rules (non-negotiable)

1. No citation without computation. A citation may only be attached for a value the request path
   actually computed this call: trips come from `tripService.search(...)`, bookings from
   `bookingService.getMyBookings(...)`, fares from `fareCalculator.calculate(...)` / the
   `FareRuleRepository` lookup, route counts from the `RouteRepository` catalogue.
2. One source per claim type. Do not hand-write numbers into `label` that differ from the `reply`
   text — derive the label from the same DTO fields used to build the sentence.
3. Never guess a `ref`. If a trip id, booking ref, route id, or fare rule id is unavailable, omit
   the citation for that claim rather than inventing one.
4. Mark demo/sandbox facts. Any claim that only holds in this demo build must say so in the reply
   (e.g. "PayHere at checkout (sandbox mode in this demo)") and cite the matching fact-sheet key
   (`payment-sandbox`). Do not present sandbox payments or the seeded catalogue as production data.
5. FAQ citations are static. `faq-factsheet` citations point to llms.txt sections; the reply text
   must match those sections' numbers (60 minutes, 5%, 10 minutes, 111 routes, E001 only).
6. LLM upgrade path. `upgradeWithLlm(...)` may replace the reply text but must preserve the
   citations the deterministic engine attached; the LLM only rephrases the already-grounded answer
   and must not add new factual claims (the system prompt already forbids inventing fares/timings).
7. Empty by default. Greetings, help, and fallback replies carry `citations: []`.

## 7. Frontend rendering spec (for the React agent — do NOT implement here)

- The assistant message object in `frontend/src/components/AiAssistant.jsx` should read
  `data.citations` alongside `data.reply`, `data.action`, `data.suggestions`.
- Render each citation as a small chip under the reply bubble, inside the same message card:
  - text: the `label` (truncated with ellipsis beyond ~48 chars)
  - subdued styling (e.g. `text-[10px] text-slate-400 border border-slate-700 rounded-full px-2 py-0.5`)
  - a lock/source glyph or the word "source" to signal traceability
- Add a tooltip or title attribute exposing `source` and `ref` for power users and assistive tech,
  e.g. `title="source: trip-search · ref: 101"`.
- Cap rendering at 6 chips per reply and collapse the rest behind a "+N more" toggle to avoid
  visual noise on the 3-trip search example (6 citations).
- Do not change the reply text or the action handling; citations are display-only.

## 8. Backend integration checklist (for the backend agent — pseudocode)

### 8.1 DTO

```
record AssistantResponse(String reply,
                         List<String> suggestions,
                         AssistantAction action,
                         List<Citation> citations)
  with record Citation(String label, String source, String ref)

  // keep the existing 3-arg factory for backward compatibility
  static of(reply, suggestions, action) -> new AssistantResponse(reply, suggestions, action, List.of())
  // new factory used by the intents below
  static of(reply, suggestions, action, citations) -> new AssistantResponse(..., citations)
```

- Jackson serializes `citations` only when the new 4-arg factory is used; old call sites keep
  returning `citations: []`. No client breakage.

### 8.2 AssistantService.chat(message, userId, roles)

```
search intent (extractCities != null):
  results = tripService.search(from, to, today, null, null, null, null)
  citations = []
  for each shown result r (up to 3):
    citations.add({ label: "{from}→{to} · {dep} · {busType} · LKR {fare}",
                    source: "trip-search", ref: r.tripId.toString() })
    citations.add({ label: "Fare rule {routeNumber}+{busType}",
                    source: "fare-rule", ref: "route{r.routeId}+{r.busType}" })
  return AssistantResponse.of(reply, suggestions, action.search(...), citations)
  // no-results reply: citations = [] (nothing computed)

bookings intent:
  if userId == null:
    citations = [{ label: "Demo accounts (llms.txt)", source: "faq-factsheet", ref: "demo-accounts" }]
  else if passenger:
    page = bookingService.getMyBookings(userId, 0, 5)
    for each b in page.content:
      citations.add({ label: "{b.bookingRef} · {b.status} · LKR {b.totalFare}",
                      source: "booking", ref: b.bookingRef })
  // empty list: citations = []

routes intent:
  citations = [{ label: "Route catalogue (111 routes)", source: "route", ref: "catalogue" }]
  // reply text updated from "130+ … E01/E02/E03" to the corrected 111/E001 wording

cancel/refund FAQ:
  citations = [{ label: "Cancellation policy (llms.txt)", source: "faq-factsheet", ref: "cancellation-policy" }]

faq(lower) matching block:
  append { source: "faq-factsheet", ref: <section-key> } where section-key maps:
    pay/payhere  -> "payment-sandbox"
    board/qr     -> "qr-e-ticket"
    seat/lock    -> "seat-lock"
    expressway   -> "expressway-services"
    login        -> "demo-accounts"
    operator     -> "operator" (section app-routes or a dedicated operator note)
    conductor    -> "conductor"
    delay/alerts -> "alerts"

greeting/help/fallback: citations = [] (default)
```

### 8.3 Keep it backward-compatible

- The record keeps the existing three fields; `citations` is additive.
- The existing 3-arg `AssistantResponse.of(...)` factory is untouched and defaults `citations` to
  `List.of()`.
- `AssistantController` and the response shape for old clients are unchanged.

## 9. Fact keys referenced (llms.txt sections = canonical fact sheet)

| llms.txt section | fact key (`ref`) | value this build |
|---|---|---|
| `## route-catalogue` | `route-catalogue` | 111 routes seeded (dev) |
| `## expressway-services` | `expressway-services` | only E001, 8 routes |
| `## fare-model` | `fare-model` | base-only rules; fallback LKR 1000 |
| `## cancellation-policy` | `cancellation-policy` | 60 min / 5% |
| `## seat-lock` | `seat-lock` | 10 min |
| `## payment-sandbox` | `payment-sandbox` | PayHere sandbox |
| `## qr-e-ticket` | `qr-e-ticket` | QR per seat |
| `## demo-accounts` | `demo-accounts` | password123 accounts |

## 10. Acceptance checks

- `POST /api/v1/assistant/chat` with "bus from Colombo to Kandy" returns `citations` with 6 entries
  (3 trip-search + 3 fare-rule) and every `ref` resolves to a real seeded trip/fare.
- "show my bookings" as nimal@vygo.lk returns a `booking` citation whose `ref` equals the seeded
  `DEMO-VY-...` ref shown in the reply.
- "show my bookings" as a guest returns `citations: []` (or only the demo-accounts fact).
- "routes" returns a corrected reply (111 / E001) with `route/catalogue` citation.
- Old clients parsing only `reply`, `suggestions`, `action` still work (3-arg factory default).
- `frontend/public/ai-context.json` and `frontend/public/llms.txt` remain valid after the content
  changes (llms.txt numbers match `DataInitializer`).

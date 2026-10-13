# VyGo API Contract — Live Route Tools Directory

| | |
|---|---|
| **Status** | Approved for implementation (contract-first) |
| **Base path** | `/api/v1` |
| **Feature** | Public "Route Tools" directory: expressway & normal route corridors with operators, contact phones, notes, and per-corridor timetables derived from the live schedule engine |
| **Read-only** | `YES` — no endpoint creates, updates, or deletes data |
| **Auth** | None required (public). Matches `GET /routes`, `GET /operators/public` |
| **Doc location** | `backend/docs/route-tools-api.md` |
| **Last updated** | 2026-08-03 |

---

## 1. Overview

Passengers can browse a directory of route corridors (expressway corridors such as
"Southern Expressway · Colombo – Kataragama", and normal city-pair corridors such as
"Colombo – Kandy"). Each corridor lists the operators that run it, their contact phone
numbers, the route numbers involved, and a per-corridor timetable derived from the **live
schedule engine** (`Schedule` entities with `status = ACTIVE` — the same source used by
`GET /api/v1/buses/search`).

The feature is deliberately **read-only**. Bookability remains the job of
`GET /api/v1/buses/search?from=&to=&date=...`; the directory tells a passenger *what runs
on a corridor* and *who to call*, then hands off to the search endpoint for a specific date.

---

## 2. Conventions (matched to the existing codebase)

- Base REST path is `/api/v1`, as in `RouteController`, `BusSearchController`,
  `OperatorPublicController`.
- Controller shape: `@RestController` + `@RequestMapping("/api/v1/route-tools")` +
  `@Tag(name = "Route Tools", description = "Public route tools directory")` and one
  `@Operation(summary = ...)` per method (springdoc/OpenAPI).
- DTOs are Java records (like `RouteResponseDto`, `SearchResponse`, `SeatMapResponse`).
- Field naming is **camelCase** throughout (existing records).
- All times are `"HH:mm"` 24-hour strings, Asia/Colombo wall-clock, no offset — identical to
  `SearchResponse.departureTime`/`arrivalTime` and `BoardingPointDto.time`.
- Distances are `BigDecimal` (JSON number), durations are `Integer` (minutes), fares are
  `BigDecimal` (JSON number) — identical to `RouteResponseDto` and `SearchResponse`.
- Errors use the existing `ErrorResponse` record: JSON
  `{ "status": int, "error": "message", "path": "/api/v1/...", "timestamp": "..." }`
  (see §7). The frontend reads `err.response.data.error`.
- `application.yml` sets `spring.jackson.default-property-inclusion: non_null`, so **null
  fields are omitted from JSON**. Frontend code MUST tolerate absent fields for every
  nullable column (`via`, `notes`, `distanceKm`, `durationMin`).

---

## 3. Endpoint map

| Method | Path | Purpose | Success | Failure |
|---|---|---|---|---|
| `GET` | `/api/v1/route-tools` | List corridor directory, filterable | `200` array of `RouteToolDto` | `400` bad `network` |
| `GET` | `/api/v1/route-tools/{id}` | One corridor | `200` `RouteToolDto` | `404` unknown id, `400` invalid id |
| `GET` | `/api/v1/route-tools/{id}/timetable` | Per-corridor timetable | `200` array of `ScheduleView` (may be `[]`) | `404` unknown id, `400` invalid id |

No `POST`/`PUT`/`PATCH`/`DELETE` variants exist. Any write verb on these paths returns
`405` via the existing `HttpRequestMethodNotSupportedException` handler.

---

## 4. Schemas

### 4.1 `RouteToolDto`

```text
id               Long     REQUIRED  Corridor id — positive; equals the anchor route id (see §5.1)
corridor         String   REQUIRED  Human display name of the corridor (§5.3)
fromCity         String   REQUIRED  Origin city (normalized, e.g. "Colombo")
toCity           String   REQUIRED  Destination city (normalized, e.g. "Kandy")
via              String   nullable  Comma-joined distinct intermediate cities, or null/absent
network          String   REQUIRED  Enum: "EXPRESSWAY" | "NORMAL"
operatorType     String   REQUIRED  Enum: "PRIVATE" | "GOVERNMENT" | "MIXED"
operators        String[] REQUIRED  Distinct approved operator names, alphabetically sorted
phones           String[] REQUIRED  Distinct non-blank operator phone numbers, sorted; may be []
routeNumbers     String[] REQUIRED  Distinct member route numbers, natural ascending sort
notes            String   nullable  Curated display text; may be null/absent
distanceKm       Number   nullable  BigDecimal; anchor route distance; may be null/absent
durationMin      Number   nullable  Integer minutes; anchor route duration; may be null/absent
hasBookableTrips boolean  REQUIRED  true iff ≥1 ACTIVE schedule exists on a member route
```

### 4.2 `ScheduleView` (timetable row)

```text
routeNumber     String            REQUIRED  Route number of the schedule's route
operator        String            REQUIRED  Operator name (Schedule.operator.name)
busType         String            REQUIRED  Enum name of Bus.BusType: NORMAL|SEMI_LUXURY|LUXURY|AC
departureTime   String            REQUIRED  "HH:mm" 24h wall-clock
arrivalTime     String            REQUIRED  "HH:mm" 24h wall-clock
distanceKm      Number            REQUIRED  Route.distanceKm (BigDecimal)
durationMin     Number            REQUIRED  Route.durationMin (Integer)
fare            Number            REQUIRED  BigDecimal, from FareRule+FareCalculator (fallback 1000.00)
boardingPoints  BoardingPointView[] REQUIRED Route boarding points ordered by sequence
```

### 4.3 `BoardingPointView`

```text
name   String  REQUIRED  Boarding point name
city   String  REQUIRED  City of the point
time   String  REQUIRED  "HH:mm" = schedule departure + point.timeOffsetMin
```

### 4.4 Full JSON example — `GET /api/v1/route-tools`

> Ids below are illustrative; actual values come from the `routes` table. The example
> reflects the `non_null` Jackson rule (nullable fields omitted when null).

```json
[
  {
    "id": 7,
    "corridor": "Southern Expressway · Colombo – Kandy",
    "fromCity": "Colombo",
    "toCity": "Kandy",
    "via": "Kottawa Interchange, Gelanigama Interchange",
    "network": "EXPRESSWAY",
    "operatorType": "MIXED",
    "operators": ["Expressway Bus", "SLTB"],
    "phones": ["0113000001", "0113000002"],
    "routeNumbers": ["EX 2-1"],
    "notes": "Expressway service via the Southern Expressway (E001).",
    "distanceKm": 125.00,
    "durationMin": 180,
    "hasBookableTrips": true
  },
  {
    "id": 11,
    "corridor": "Colombo – Kandy",
    "fromCity": "Colombo",
    "toCity": "Kandy",
    "via": "Kegalle, Peradeniya Junction",
    "network": "NORMAL",
    "operatorType": "PRIVATE",
    "operators": ["Lanka Express"],
    "phones": ["0112345678"],
    "routeNumbers": ["01", "03"],
    "distanceKm": 115.00,
    "durationMin": 210,
    "hasBookableTrips": true
  },
  {
    "id": 21,
    "corridor": "Colombo – Kataragama",
    "fromCity": "Colombo",
    "toCity": "Kataragama",
    "via": "Avissawella, Ratnapura, Embilipitiya, Rakwana",
    "network": "NORMAL",
    "operatorType": "GOVERNMENT",
    "operators": ["SLTB"],
    "phones": ["0113000002"],
    "routeNumbers": ["04", "32/4"],
    "notes": "Classic pilgrim service; bookable dates vary.",
    "distanceKm": 290.00,
    "durationMin": 420,
    "hasBookableTrips": false
  }
]
```

### 4.5 Full JSON example — `GET /api/v1/route-tools/{id}/timetable`
(For the corridor `Colombo – Kandy`, route `01`; two of three rows shown.)

```json
[
  {
    "routeNumber": "01",
    "operator": "Lanka Express",
    "busType": "AC",
    "departureTime": "06:00",
    "arrivalTime": "09:30",
    "distanceKm": 115.00,
    "durationMin": 210,
    "fare": 1500.00,
    "boardingPoints": [
      { "name": "Colombo Bastian Mawatha", "city": "Colombo", "time": "06:00" },
      { "name": "Kegalle", "city": "Kegalle", "time": "07:15" },
      { "name": "Peradeniya Junction", "city": "Kandy", "time": "09:15" },
      { "name": "Kandy Clock Tower", "city": "Kandy", "time": "09:30" }
    ]
  },
  {
    "routeNumber": "01",
    "operator": "Lanka Express",
    "busType": "NORMAL",
    "departureTime": "11:30",
    "arrivalTime": "15:00",
    "distanceKm": 115.00,
    "durationMin": 210,
    "fare": 650.00,
    "boardingPoints": [
      { "name": "Colombo Bastian Mawatha", "city": "Colombo", "time": "11:30" },
      { "name": "Kegalle", "city": "Kegalle", "time": "12:45" },
      { "name": "Peradeniya Junction", "city": "Kandy", "time": "14:45" },
      { "name": "Kandy Clock Tower", "city": "Kandy", "time": "15:00" }
    ]
  }
]
```

### 4.6 Empty timetable example — `200 []`

```json
[]
```

When no bookable schedule exists on the corridor's routes the endpoint returns an **empty
array** (`[]`), never `null` and never `404`. See §5.7.

---

## 5. Derivation rules (contractual — backend must implement exactly)

There is no corridor table in the current schema. v1 derives corridors deterministically
from the `routes`, `schedules`, `buses`, and `bus_operators` tables. **The grouping
algorithm below is frozen for the life of v1** (changing it changes corridor ids, which is a
breaking change — see §8).

### 5.1 Corridor grouping & ids

- Only routes with `Route.status = APPROVED` participate. (`Route.RouteType` = `NORMAL` or
  `EXPRESSWAY`; `Route.expresswayCode` is `E001`/`E003` in the seed data.)
- A **corridor key** is:
  - `EXPRESSWAY:<normalized expresswayCode>` — group by expressway code
    (`E001`, `E003`, ...). All member routes are EXPRESSWAY.
  - `NORMAL:<normalized fromCity>:<normalized toCity>` — group by the directional
    city pair, case-insensitive/trimmed. Corridors are directional:
    `Colombo → Kandy` and `Kandy → Colombo` are distinct corridors (consistent with the
    directional `from`/`to` semantics of `GET /buses/search`).
- **Corridor id = the minimum member `Route.id`** (the "anchor" route). Ids are therefore
  positive and stable for a given dataset.
- `GET /api/v1/route-tools/{id}` resolves the route by id; if it does not exist → `404`.
  Otherwise it returns the corridor whose key that route belongs to. Passing any member
  route id therefore returns the corridor (whose `id` is the anchor id).

### 5.2 `fromCity` / `toCity`

Taken directly from the corridor key (`fromCity`/`toCity` of the member routes).

### 5.3 `corridor` display name

- NORMAL: `"{fromCity} – {toCity}"` (en dash, spaces), e.g. `Colombo – Kandy`.
- EXPRESSWAY: `"{ExpresswayName} · {fromCity} – {toCity}"`, e.g.
  `Southern Expressway · Colombo – Matara`. Expressway name mapping (backend canonical codes):
  `E001` → `Southern Expressway`, `E003` → `Colombo–Katunayake Expressway`,
  anything else → `Expressway {code}`. Codes are emitted as stored (`E001`, `E003`);
  the frontend already normalizes to `E01`/`E03` for display via `displayCorridorCode`.

### 5.4 `via`

Distinct intermediate cities collected from member routes' boarding points, **excluding**
the corridor's `fromCity` and `toCity`, ordered by first occurrence along the boarding
sequence. `null` (omitted) when there are none (e.g. a direct Colombo → Katunayake run).

### 5.5 `operatorType`, `operators`, `phones`

- `operators`: distinct names of **APPROVED** operators that run **≥1 ACTIVE schedule** on a
  member route, sorted alphabetically.
- `phones`: distinct non-blank `BusOperator.phone` values for those operators, sorted.
  Blank/null phones are skipped; `phones` is `[]` when none exist. (Deviation from
  `OperatorPublicController`, which emits `""` for null — directory display only; documented
  deliberately.)
- `operatorType`: an operator is "state-owned" in v1 when its name starts with `SLTB`
  (seed convention; the predicate lives in one backend helper so it can be refined later).
  Then: all state-owned → `GOVERNMENT`; none → `PRIVATE`; mixed → `MIXED`.
  Example: `Colombo – Kandy` (Lanka Express only) → `PRIVATE`;
  `Southern Expressway · Colombo – Kandy` (Expressway Bus + SLTB) → `MIXED`;
  classic SLTB-only corridors → `GOVERNMENT`.

### 5.6 `routeNumbers`, `distanceKm`, `durationMin`, `notes`

- `routeNumbers`: distinct route numbers of member routes, natural ascending sort
  (`01`, `03`, `EX 1-1`, `EX 2-1`, ...).
- `distanceKm` / `durationMin`: taken from the **anchor route** (min id). Both are declared
  nullable and omitted when the backend cannot resolve them; in practice
  `Route.distanceKm`/`durationMin` are `NOT NULL`, so they will be present.
- `notes`: nullable curated text. v1 ships with notes for expressway corridors
  (`"Expressway service via the Southern Expressway (E001)."`) and any corridor added by
  operations to a small curated map; otherwise `null` (omitted). Frontend must render
  absent notes gracefully.

### 5.7 `hasBookableTrips` and the timetable engine

- `hasBookableTrips` = true iff at least one member route has **≥1 `Schedule` with
  `status = ACTIVE`** whose effective window includes today
  (`effectiveFrom <= today`; `effectiveTo == null || effectiveTo >= today`).
  It is **not** per-date seat availability — that stays in `/buses/search`.
- `GET .../timetable` returns one `ScheduleView` per qualifying schedule:
  - Qualifying: `Schedule.status == ACTIVE` **and** effective window includes today.
  - Day-of-week (`daysOfWeek`) is **not** applied — the directory shows the standing weekly
    pattern.
  - Sort: `departureTime` ascending, then `routeNumber` ascending, then `operator` ascending.
  - `fare`: `FareRule` for `(route.id, bus.busType)` evaluated with `FareCalculator`
    (`baseFare + perKmRate × distance`, HALF_UP, scale 2); fallback `1000.00` when no rule —
    exactly the search engine's fare semantics (`TripService.FALLBACK_BASE_FARE`).
  - `boardingPoints`: route boarding points ordered by `sequence`, `time` =
    `departureTime + timeOffsetMin` formatted `"HH:mm"` — exactly
    `TripService.toBoardingPointDto`.
  - Corridors with no qualifying schedules return `200 []`.

---

## 6. Query parameters, enumeration & validation

### 6.1 `GET /api/v1/route-tools`

| Param | Type | Required | Rules |
|---|---|---|---|
| `q` | String | no | Case-insensitive substring; matched against `corridor`, `fromCity`, `toCity`, `via`, and each `routeNumbers` value. Empty/whitespace → treated as absent. |
| `network` | String | no | Enum `EXPRESSWAY` \| `NORMAL`. **Case-insensitive** (server normalizes with `toUpperCase`). Missing → no network filter. Any other value → `400`. |

Filtering composes: both `q` and `network` may be used together (AND).

### 6.2 `GET /api/v1/route-tools/{id}` and `.../{id}/timetable`

| Rule | Result |
|---|---|
| `id` not a Long (`abc`) | `400` |
| `id <= 0` (`0`, `-5`) | `400` |
| `id` is a positive Long but no route has it | `404` |

### 6.3 Default list order (no params)

1. `network`: `EXPRESSWAY` first, then `NORMAL`.
2. EXPRESSWAY: `expresswayCode` ascending (`E001`, `E003`, ...), then `fromCity` ascending, then `toCity` ascending.
3. NORMAL: `fromCity` ascending, then `toCity` ascending (mirrors existing `findAllByOrderByFromCityAsc`).

### 6.4 Implementation note (error mapping gap)

`GlobalExceptionHandler` currently has no handler for
`MethodArgumentTypeMismatchException` (thrown for enum/number binding failures); those fall
through to the generic `Exception` handler → `500`. **The backend MUST add a handler (or
bind as `String` and validate) so invalid `network` and non-numeric `id` return `400`, not
`500`.** This is a contract requirement for these endpoints.

---

## 7. Error contract

Errors reuse the existing `ErrorResponse` record (no new error envelope):

```json
{
  "status": 404,
  "error": "Route tool corridor not found",
  "path": "/api/v1/route-tools/9999999",
  "timestamp": "2026-08-03T10:15:30Z"
}
```

| Status | Condition | `error` message |
|---|---|---|
| `400` | invalid `network` | `Invalid value for parameter 'network'. Allowed values: EXPRESSWAY, NORMAL` |
| `400` | `id` non-numeric or `<= 0` | `Invalid route tool id: must be a positive integer` |
| `404` | unknown `id` | `Route tool corridor not found` |
| `405` | write verb (POST/PUT/PATCH/DELETE) | (framework message) |
| `500` | unhandled | `Internal server error` |

The `error` field is the message the frontend surfaces via `errorMessage(err, fallback)`.

---

## 8. Versioning & evolution guidance

- **Stay on `/api/v1`.** This feature is new; ship it additive-only inside v1.
- **Safe (additive — no version bump):**
  - New optional query parameters (e.g. a future `region`, `page`/cursor pagination).
  - New optional fields on `RouteToolDto`/`ScheduleView` (e.g. adding
    `expresswayCode` to `RouteToolDto` later is safe).
  - New enum values for `network`/`operatorType`/`busType` — document that clients must
    tolerate unknown values.
  - New read-only endpoints under `/api/v1/route-tools/...`.
  - New `4xx` `error` messages within the existing `ErrorResponse` shape.
- **Breaking — requires `/api/v2` + deprecation process, never silent:**
  - Renaming/removing a field, changing a field's type or format, changing an HTTP status
    meaning, removing a query parameter, making an optional parameter required.
  - **Changing the corridor grouping algorithm** (id semantics are contractually frozen in
    v1, §5.1).
- **Deprecation policy:** announce via changelog + migration guide, emit `Deprecation` and
  `Sunset` response headers, provide ≥6 months runway, monitor per-consumer usage, and only
  remove once usage is near zero.
- Times/fares must remain byte-identical (`"HH:mm"`, `BigDecimal` scale 2) across versions.

---

## 9. Client contract (frontend)

Base URL is already `/api/v1` on the shared `api` axios instance
(`src/api/client.js`, timeout 15000, auto Bearer header — harmless on public endpoints).

### 9.1 Exact axios calls

```js
import { api, errorMessage } from '../api/client'

// List directory (both params optional — omit when absent)
api.get('/route-tools', { params: { q, network } })

// Single corridor detail
api.get(`/route-tools/${id}`)

// Per-corridor timetable
api.get(`/route-tools/${id}/timetable`)
```

### 9.2 Loading / error / cancellation pattern (mirror `pages/Routes.jsx`)

```js
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')
const [corridors, setCorridors] = useState([])

useEffect(() => {
  let cancelled = false
  setLoading(true)
  setError('')
  api
    .get('/route-tools', { params: { q, network } })
    .then((res) => { if (!cancelled) setCorridors(res.data || []) })
    .catch((err) => { if (!cancelled) setError(errorMessage(err, 'Failed to load route tools')) })
    .finally(() => { if (!cancelled) setLoading(false) })
  return () => { cancelled = true }
}, [q, network])
```

- `200` always yields an array — initialize state to `[]`, never null.
- Read `err.response.data.error` for messages; treat `err.response?.status === 404` on the
  detail/timetable calls as "corridor not found" and route to a friendly empty state.
- Because `non_null` omits nulls, read nullable fields defensively:
  `dto.via || ''`, `dto.notes || ''`, and guard `dto.distanceKm`/`dto.durationMin` with
  `Number.isFinite` before rendering.
- Corridor ids are Longs — use them in URLs via template literals; do not assume
  contiguous/sequential numbering.

### 9.3 TypeScript-style reference interfaces

> The app is JSX; these are the canonical shapes the backend contract guarantees, kept here
> so typed consumers and future TypeScript migration stay aligned.

```ts
type RouteNetwork = 'EXPRESSWAY' | 'NORMAL'
type OperatorType = 'PRIVATE' | 'GOVERNMENT' | 'MIXED'
type BusType = 'NORMAL' | 'SEMI_LUXURY' | 'LUXURY' | 'AC'

interface BoardingPointView {
  name: string
  city: string
  time: string // "HH:mm" 24h, Asia/Colombo
}

interface ScheduleView {
  routeNumber: string
  operator: string
  busType: BusType
  departureTime: string // "HH:mm"
  arrivalTime: string   // "HH:mm"
  distanceKm: number
  durationMin: number
  fare: number
  boardingPoints: BoardingPointView[]
}

interface RouteToolDto {
  id: number // positive; anchor route id of the corridor
  corridor: string
  fromCity: string
  toCity: string
  via?: string | null
  network: RouteNetwork
  operatorType: OperatorType
  operators: string[]
  phones: string[]
  routeNumbers: string[]
  notes?: string | null
  distanceKm?: number | null
  durationMin?: number | null
  hasBookableTrips: boolean
}
```

---

## 10. Acceptance criteria / API Tester checklist

Setup: dev profile seeds the in-memory H2 database via `DataInitializer` (routes `01`
Colombo–Kandy with three ACTIVE schedules; route `03` Colombo–Kandy with no schedules;
route `04`/`32/4` Colombo–Kataragama with no schedules; EX 2-1/EX 2-2 E001 expressways with
schedules; EX 3-1/EX 3-2 E003 with schedules).

1. **List default order** — `GET /api/v1/route-tools` → `200`, JSON array. Every item has the
   non-nullable fields present (`id`, `corridor`, `fromCity`, `toCity`, `network`,
   `operatorType`, `operators`, `phones`, `routeNumbers`, `hasBookableTrips`). Order:
   all `EXPRESSWAY` items first, then `NORMAL`; EXPRESSWAY sorted by expressway code then
   from/to; NORMAL sorted by fromCity then toCity.
2. **Public & read-only** — No `Authorization` header required (200 without it).
   `POST`/`PUT`/`PATCH`/`DELETE` on `/route-tools`, `/route-tools/{id}` and
   `/route-tools/{id}/timetable` → non-2xx (`405`), and no data is modified afterwards
   (re-GET list unchanged).
3. **`q` city filter** — `GET /api/v1/route-tools?q=Kandy` → `200`; every returned corridor
   matches `Kandy` in `corridor`/`fromCity`/`toCity`/`via`/`routeNumbers`; the NORMAL
   `Colombo – Kandy` corridor is included.
4. **`q` case-insensitive** — `?q=kandy` and `?q=KANDY` return identical `id` sets.
5. **`q` no match** — `?q=Zzzzzzz` → `200 []`.
6. **`q` matches route number** — `?q=01` → `200`; includes the corridor whose
   `routeNumbers` contains `"01"` (NORMAL `Colombo – Kandy`, `routeNumbers: ["01","03"]`).
7. **`network` filter** — `?network=EXPRESSWAY` → `200`, every item `network == "EXPRESSWAY"`
   (≥1 item with `corridor` starting `Southern Expressway ·`). `?network=NORMAL` → `200`,
   every item `network == "NORMAL"`.
8. **`network` case-insensitive** — `?network=expressway` returns the same `id` set as
   `?network=EXPRESSWAY`.
9. **Invalid `network`** — `?network=HOVER` → `400`, body has an `error` field naming the
   allowed values (`EXPRESSWAY`, `NORMAL`). **Must not be `500`.**
10. **Detail 200 + consistency** — Take any `id` from the list; `GET /api/v1/route-tools/{id}`
    → `200` and the body equals that list item. Same `id` on `.../{id}/timetable` → `200`.
11. **Detail 404** — `GET /api/v1/route-tools/9999999` and
    `GET /api/v1/route-tools/9999999/timetable` → `404` with
    `{ "status": 404, "error": "Route tool corridor not found", "path": ..., "timestamp": ... }`.
12. **Invalid id** — `GET /api/v1/route-tools/0` and `GET /api/v1/route-tools/abc` → `400`
    (not `500`).
13. **Timetable populated for corridor referencing route `01`** — Resolve the NORMAL
    `Colombo – Kandy` corridor id (its `routeNumbers` contains `"01"`); `GET .../{id}/timetable`
    → `200` array of length ≥ 1. Rows sorted by `departureTime` ascending; every row has all
    `ScheduleView` fields; the row with `departureTime == "06:00"` has
    `busType == "AC"`, `fare == 1500.00`, and `boardingPoints[0] ==
    { name: "Colombo Bastian Mawatha", city: "Colombo", time: "06:00" }`.
14. **Timetable empty when no bookable schedule** — Resolve the NORMAL `Colombo – Kataragama`
    corridor (`routeNumbers` contains `"04"`); `GET .../{id}/timetable` → `200 []` (empty
    array, not null) and its `hasBookableTrips == false` in the list response.

---

## 11. Decision log

| # | Decision | Rationale |
|---|---|---|
| 1 | Corridors grouped by `expresswayCode` (EXPRESSWAY) or directional city pair (NORMAL); no corridor table in v1 | Deterministic, testable; frozen for v1 (§8) |
| 2 | Corridor `id` = anchor (min member `Route.id`); any member id resolves the corridor | Stable positive ids without new schema |
| 3 | `network` accepted case-insensitively | Better DX than strict Spring enum binding; contract mandates a `400` (not `500`) for bad values |
| 4 | Timetable shows the standing weekly pattern (no `daysOfWeek` filter), but only ACTIVE schedules effective today | Matches "live schedule engine" while keeping the directory useful year-round |
| 5 | `phones` skips blank/null numbers instead of emitting `""` | Cleaner directory display; deviation from `OperatorPublicController` noted (§5.5) |
| 6 | `operatorType` state-ownership predicate = name starts with `SLTB` in v1 | Seed reality; isolated in one helper for later refinement |
| 7 | Empty timetable is `200 []`, never `404` | Corridor exists — its schedule simply has no current departures |

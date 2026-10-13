# VyGo — Advanced Online Bus Booking & Fleet Management System (Sri Lanka)

## Overview
VyGo modernises inter-provincial and intercity bus travel in Sri Lanka. It is a
multi-tenant platform with four user roles:

| Role | Portal |
|------|--------|
| `PASSENGER` | Passenger Portal — search, book seats, pay, e-tickets, reviews |
| `OPERATOR` | Operator Portal — fleets, routes, schedules, pricing, reports |
| `CONDUCTOR` | Conductor Dashboard — QR validation, live occupancy, manual booking, reconciliation |
| `ADMIN` | Administration Portal — users, approvals, analytics, audit, complaints |

## Tech Stack
- **Backend:** Java 21, Spring Boot 3.3.x, Spring Web, Spring Data JPA, Spring Security, JWT, springdoc-openapi (Swagger UI), ZXing (QR), Lombok, Maven.
- **Database (production):** MySQL 8 (DDL in `database/schema.sql` + `database/seed.sql`).
- **Database (local demo):** H2 in-memory, `ddl-auto: update` + programmatic `DataInitializer` seeder. No DB install needed.
- **Frontend:** React 18 + Vite + Tailwind CSS + React Router + Axios. Responsive (mobile/tablet/desktop), i18n light (EN/SI/TA).
- **Integrations:** PayHere sandbox (mock adapter), email (SMTP stub), SMS (stub), Google Maps (optional, graceful fallback).

## Project Layout
```
vygo/
├── backend/                  # Spring Boot app (group: com.vygo, artifact: vygo-backend)
│   └── src/main/java/com/vygo/
│       ├── VyGoApplication.java
│       ├── config/           # Security, OpenAPI, CORS, AppProperties, DataInitializer
│       ├── security/         # JwtTokenProvider, JwtAuthenticationFilter, CustomUserDetailsService
│       ├── entity/           # JPA entities (map exactly to MySQL schema)
│       ├── repository/       # Spring Data JPA repositories
│       ├── dto/              # Request/response DTOs
│       ├── service/          # Business logic + @Transactional
│       ├── controller/       # REST controllers (/api/v1)
│       ├── integration/      # PayHereClient, EmailSender, SmsSender, GeoService, StorageService
│       ├── exception/        # ApiException + GlobalExceptionHandler
│       └── util/             # QrCodeGenerator, BookingRefGenerator, FareCalculator
│   └── src/main/resources/
│       ├── application.yml   # profiles: dev (H2), prod (MySQL via env vars)
│       └── openapi.yaml      # committed OpenAPI spec
│   └── src/test/java/com/vygo/   # JUnit 5 + MockMvc tests
├── frontend/                 # React + Vite app
│   └── src/
│       ├── api/              # axios client + endpoint constants
│       ├── context/          # AuthContext, ToastContext, I18nContext
│       ├── components/       # shared UI (SeatMap, QR, Layout, modals, charts)
│       ├── pages/            # portal pages
│       └── i18n/             # en.js, si.js, ta.js
├── database/                 # schema.sql, seed.sql (MySQL 8, canonical design)
├── docs/                     # this file, API_CONTRACT.md, TESTING_REPORT.md
├── postman/                  # vygo.postman_collection.json + environment
└── docker-compose.yml        # optional MySQL 8
```

## Entity Model (canonical — see `database/schema.sql` for exact DDL)
```
users(bigint id, full_name, email, mobile, password_hash, otp_code, otp_expires_at,
      otp_verified, enabled, created_at, updated_at)
roles(id, code[PASSENGER|OPERATOR|CONDUCTOR|ADMIN], name)
user_roles(user_id, role_id)
bus_operators(id, user_id owner, name, registration_no, license_no, address, contact_person,
      phone, email, status[PENDING|APPROVED|REJECTED|SUSPENDED], created_at)
buses(id, operator_id, registration_no, bus_type[NORMAL|SEMI_LUXURY|LUXURY|AC],
      capacity, amenities JSON, model, year, status[ACTIVE|MAINTENANCE|INACTIVE])
routes(id, from_city, to_city, distance_km, duration_min, status)
boarding_points(id, route_id, name, sequence, city, lat, lng, time_offset_min)
fare_rules(id, route_id, bus_type, base_fare, per_km_rate, surge_multiplier)
schedules(id, route_id, bus_id, operator_id, departure_time, arrival_time,
      days_of_week VARCHAR (e.g. "1,2,3,4,5,6,7"), effective_from, effective_to, status)
trips(id, schedule_id, trip_date, status[SCHEDULED|ON_TIME|DELAYED|DEPARTED|COMPLETED|CANCELLED])
seat_inventory(id, trip_id, seat_number, status[AVAILABLE|LOCKED|BOOKED], lock_owner,
      lock_expires_at, booking_id, price)   -- UNIQUE(trip_id, seat_number)
bookings(id, booking_ref, passenger_id, trip_id, status[PENDING|CONFIRMED|CANCELLED|COMPLETED],
      seats_count, total_fare, boarding_point_id, dropoff_point_id, booked_via[ONLINE|MANUAL],
      created_by, cancelled_at, cancellation_reason, created_at)
booking_seats(id, booking_id, trip_id, seat_number, price)
payments(id, booking_id, gateway_txn_id, amount, currency[LKR], method[CARD|WALLET|CASH],
      gateway[PAYHERE_SANDBOX|CASH], status[PENDING|SUCCESS|FAILED|REFUND_PENDING|REFUNDED],
      paid_at, created_at)
refunds(id, payment_id, booking_id, amount, reason, status[PENDING|COMPLETED|FAILED],
      processed_at)
tickets(id, booking_id, ticket_ref, passenger_name, seat_number, qr_content, qr_code_url,
      status[ACTIVE|USED|CANCELLED], validated_by, validated_at, created_at)
reviews(id, booking_id, passenger_id, operator_id, trip_id, rating(1-5), comment, created_at)
notifications(id, user_id, channel[EMAIL|SMS], subject, body, status[PENDING|SENT|FAILED],
      sent_at, created_at)
audit_logs(id, actor_id, action, entity_type, entity_id, details, ip_address, created_at)
complaints(id, passenger_id, booking_id, subject, description, status[OPEN|IN_PROGRESS|RESOLVED|CLOSED],
      resolution, assigned_to, created_at, updated_at)
```

## Key Business Rules
1. **Seat locking:** `POST /bookings/lock-seats` marks seats `LOCKED` with a 10-minute TTL (`lock_expires_at`). Expired locks revert to `AVAILABLE` (lazy release on read). Locked seats cannot be locked/booked by others.
2. **Concurrent booking safety:** booking creation is `@Transactional` and uses pessimistic writes (`SELECT ... FOR UPDATE`) on the affected `seat_inventory` rows to prevent double-booking.
3. **Payment:** booking is created as `PENDING`; it becomes `CONFIRMED` only after payment `SUCCESS`. In sandbox mode `POST /payments/confirm` simulates the PayHere callback.
4. **Ticket:** one ticket per seat per booking; QR content is a JSON payload signed with HMAC-SHA256 (secret in config). `POST /tickets/validate` verifies signature + status.
5. **Cancellation/refund:** `POST /bookings/{ref}/cancel` — allowed up to 60 min before departure (configurable). Marks tickets CANCELLED, releases seats, creates refund (100% minus `cancellation_fee_pct`).
6. **RBAC:** `ADMIN > OPERATOR, CONDUCTOR (assigned) > PASSENGER`. Conductor/operator controllers check `operatorId` ownership.

## Backend Conventions
- Base URL: `/api/v1`. DTOs in `com.vygo.dto`. Errors: `{ "status": int, "error": "message", "path": "...", "timestamp": "..." }` from `GlobalExceptionHandler`.
- Auth: `Authorization: Bearer <jwt>`. Access token TTL 2h (configurable). Use `@PreAuthorize("hasRole('ADMIN')")` style method security.
- Response envelope: plain JSON (no wrapper) unless noted.
- Currency: `LKR`, integer minor units not required — use `BigDecimal` with 2dp.
- Dates: ISO-8601 `yyyy-MM-dd` for dates, `HH:mm` for times, `yyyy-MM-dd'T'HH:mm:ss` for timestamps.
- Keep controllers thin; all logic in services; annotate transactional methods.
- Logging via SLF4J with request-id (MDC optional — keep simple).
- Audit: `AuditService.record(actor, action, entityType, entityId, details)` called from mutating services.
- Tests: JUnit 5 + `@SpringBootTest` + MockMvc + H2. Cover auth, search, seat lock/release, booking concurrency, payment confirm, ticket validate, cancellation/refund.

## Frontend Conventions
- React 18, function components + hooks, React Router v6, Axios instance in `src/api/client.js` with request interceptor attaching JWT from localStorage and response interceptor for 401 → redirect to login.
- Tailwind (dark theme baseline: slate-900 background, white text, emerald-500 primary, red-600 danger — match existing VyGo dark aesthetic).
- Routes:
  - Public: `/`, `/search`, `/book/:tripId`, `/checkout`, `/payment-result`, `/ticket/:ref`, `/login`, `/register`, `/login/otp`, `/routes`
  - `/passenger/*` — dashboard, bookings, booking detail, cancel, review, profile
  - `/operator/*` — dashboard, fleet, routes, schedules, pricing, occupancy, reports
  - `/conductor/*` — trips, trip detail (live seats), scan, manual booking, reconciliation
  - `/admin/*` — dashboard, users, operators, approvals, analytics, complaints, audit logs
- Auth gate component `RequireAuth` with `roles` prop.
- `SeatMap` component: renders 2D bus layout (driver front, 2+2 columns with aisle, rear row), seat states AVAILABLE/LOCKED/BOOKED/SELECTED, click to select.
- i18n: `src/i18n/{en,si,ta}.js` dictionaries + `useI18n()` hook; `lang` persisted in localStorage; default `en`.

## Testing & Evidence
- `mvn test` unit + integration; `mvn spring-boot:run` starts app at :8080; Swagger UI at `/swagger-ui.html`.
- Postman collection in `postman/` with environment vars (baseUrl, token, ref, tripId).
- Evidence gathered into `docs/TESTING_REPORT.md`.

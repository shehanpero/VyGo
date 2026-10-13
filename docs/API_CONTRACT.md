# VyGo REST API Contract v1.0

Base URL: `http://localhost:8080/api/v1` · Auth: `Authorization: Bearer <JWT>`
Swagger UI: `http://localhost:8080/swagger-ui.html` · OpenAPI JSON: `/v3/api-docs`

Roles: `ROLE_PASSENGER`, `ROLE_OPERATOR`, `ROLE_CONDUCTOR`, `ROLE_ADMIN`.
Unrestricted endpoints are marked **PUBLIC**. All others require JWT + role.

Error body (HTTP 4xx/5xx):
```json
{ "status": 400, "error": "Human readable message", "path": "/api/v1/...", "timestamp": "2026-01-01T10:00:00" }
```

---

## 1. Auth

### POST /auth/register — PUBLIC
```json
{ "fullName": "Nimal Perera", "email": "nimal@mail.com", "mobile": "0712345678", "password": "secret123", "role": "PASSENGER" }
```
`role` ∈ PASSENGER | OPERATOR (operator must also pass operator fields below). For OPERATOR:
```json
{ "fullName": "...", "email": "...", "mobile": "...", "password": "...", "role": "OPERATOR",
  "operator": { "name": "Lanka Express", "registrationNo": "PV-1234", "licenseNo": "L-88", "address": "...", "contactPerson": "...", "phone": "011..." } }
```
→ 201 `{ "id":1, "fullName":"...", "email":"...", "mobile":"...", "roles":["PASSENGER"], "enabled":true }`

### POST /auth/login — PUBLIC
```json
{ "username": "nimal@mail.com", "password": "secret123" }
```
→ 200 `{ "accessToken": "jwt...", "tokenType":"Bearer", "expiresIn":7200, "user": { "id":1,"fullName":"...","email":"...","mobile":"...","roles":["PASSENGER"],"enabled":true,"operatorId":null } }`

### POST /auth/otp/request — PUBLIC (Sri Lanka mobile OTP)
```json
{ "mobile": "0712345678" }
```
→ 200 `{ "message": "OTP sent", "devOtp": "123456" }` (dev mode returns the OTP; real gateway would SMS it)

### POST /auth/otp/verify — PUBLIC
```json
{ "mobile": "0712345678", "otp": "123456" }
```
Creates the user if absent (role PASSENGER). → 200 same shape as login (returns token)

### GET /auth/me — any authenticated
→ 200 user object (same shape as login `user`)

### POST /auth/change-password — any authenticated
```json
{ "currentPassword": "old", "newPassword": "new12345" }
```
→ 200 `{ "message": "Password updated" }`

---

## 2. Search & Booking (PASSENGER)

### GET /buses/search — PUBLIC
Query: `from`, `to` (city names, case-insensitive), `date` (yyyy-MM-dd), optional `time`, `busType`, `sort=fare|departure`
→ 200
```json
[ { "tripId":101, "routeId":3, "from":"Colombo","to":"Kandy","busType":"AC",
    "operator":"Lanka Express","busReg":"ND-1234","departureTime":"06:00","arrivalTime":"09:30",
    "distanceKm":115,"durationMin":210,"fare":1500.00,"availableSeats":32,"seatsTotal":45,
    "boardingPoints":[{"id":1,"name":"Colombo Bastian Mawatha","city":"Colombo","time":"06:00"}],
    "dropoffPoints":[{"id":4,"name":"Kandy Clock Tower","city":"Kandy","time":"09:30"}] } ]
```

### GET /trips/{tripId}/seats — PUBLIC
→ 200 `{ "tripId":101, "busType":"AC", "capacity":45, "farePerSeat":1500.00, "seats":[ { "seatNumber":"1","status":"AVAILABLE","price":1500.00 }, ... ] }`
`status` ∈ AVAILABLE | LOCKED | BOOKED. LOCKED seats include `lockExpiresAt`.

### POST /bookings/lock-seats — PASSENGER (JWT)
```json
{ "tripId":101, "seatNumbers":["1","2"], "boardingPointId":1, "dropoffPointId":4 }
```
→ 200 `{ "lockToken":"uuid", "lockedSeats":["1","2"], "expiresAt":"2026-01-01T10:10:00", "totalFare":3000.00 }`
Rejects if a seat is already LOCKED/BOOKED (409).

### POST /bookings — PASSENGER (JWT) — create booking from lock
```json
{ "lockToken":"uuid", "tripId":101, "seatNumbers":["1","2"], "boardingPointId":1, "dropoffPointId":4 }
```
→ 201
```json
{ "id":50, "bookingRef":"VY-20260717-8F3K", "tripId":101, "status":"PENDING",
  "seatNumbers":["1","2"], "seatsCount":2, "totalFare":3000.00,
  "boardingPoint":{"id":1,"name":"Colombo Bastian Mawatha","time":"06:00"},
  "dropoffPoint":{"id":4,"name":"Kandy Clock Tower","time":"09:30"},
  "bus":{"tripId":101,"operator":"Lanka Express","reg":"ND-1234","type":"AC","departureTime":"06:00"},
  "tripDate":"2026-07-17", "createdAt":"2026-07-01T09:00:00",
  "paymentRequired":3000.00 }
```

### GET /bookings/my — PASSENGER
Query: `page` (0-based), `size` (default 10). → 200 `{ "content":[...BookingResponse], "totalElements":3, "totalPages":1 }`

### GET /bookings/{ref} — PASSENGER (owner) or ADMIN
→ 200 BookingResponse with `passengerName`, `tickets` array when confirmed.

### POST /bookings/{ref}/cancel — PASSENGER (owner)
```json
{ "reason": "Changed plans" }
```
→ 200 BookingResponse with `status:"CANCELLED"`, plus `refund` object if applicable:
`{ "refund": { "amount": 2850.00, "fee": 150.00, "status": "COMPLETED" } }`
Rules: cannot cancel < 60 min before departure or after departure; seats are released.

---

## 3. Payments (PASSENGER)

### POST /payments/initiate — PASSENGER (JWT)
```json
{ "bookingRef": "VY-20260717-8F3K", "method": "CARD" }
```
`method` ∈ CARD | WALLET | CASH. → 201
```json
{ "paymentId": 9, "txnId": "PY-20260717-A1B2", "amount": 3000.00, "status": "PENDING",
  "redirectUrl": "http://localhost:8080/api/v1/payments/sandbox/{txnId}",   // sandbox payment page
  "sandbox": true }
```

### GET /payments/{txnId} — PASSENGER (owner)
→ 200 `{ "paymentId":9, "txnId":"PY-...", "amount":3000.00, "status":"SUCCESS", "method":"CARD", "paidAt":"..." }`

### POST /payments/confirm — PASSENGER (JWT) — simulate gateway callback
```json
{ "txnId": "PY-20260717-A1B2" }
```
→ 200 payment object with `status:"SUCCESS"`. If amount differs or booking mismatch → 409.
On success the booking flips to CONFIRMED and tickets are generated.

### POST /payments/{txnId}/refund — PASSENGER (owner) or ADMIN
```json
{ "reason": "Duplicate charge" }
```
→ 200 `{ "refundId":3, "paymentId":9, "amount":3000.00, "status":"COMPLETED" }` and payment status → REFUNDED.

---

## 4. Tickets (PASSENGER / CONDUCTOR)

### GET /tickets/{ref} — PASSENGER (owner) or CONDUCTOR/ADMIN
→ 200
```json
{ "id":12, "ticketRef":"TK-20260717-77AA", "bookingRef":"VY-...", "passengerName":"Nimal Perera",
  "seatNumber":"1", "tripDate":"2026-07-17", "departureTime":"06:00", "from":"Colombo","to":"Kandy",
  "busReg":"ND-1234", "operator":"Lanka Express", "status":"ACTIVE", "qrCodeUrl":"/api/v1/tickets/TK-.../qr" }
```

### GET /tickets/{ref}/qr — PUBLIC (PNG bytes) — returns QR image
Content-Type `image/png`.

### POST /tickets/validate — CONDUCTOR
```json
{ "qrContent": "<raw string from QR>", "tripId": 101 }
```
→ 200 `{ "valid":true, "message":"Ticket valid", "ticket":{...} }` or 200 `{ "valid":false, "message":"Already used" }`.
Marks ticket USED when valid and trip matches.

---

## 5. Routes / Operators / Reviews (PUBLIC reads)

### GET /routes — PUBLIC
Query: `q` optional. → 200 `[{ "id":1,"fromCity":"Colombo","toCity":"Kandy","distanceKm":115,"durationMin":210 }]`

### GET /operators/public — PUBLIC
→ 200 `[{ "id":1,"name":"Lanka Express","rating":4.5,"reviewCount":12 }]`

### POST /reviews — PASSENGER (JWT)
```json
{ "bookingRef":"VY-...", "rating":5, "comment":"Great trip" }
```
→ 201 review object. One review per completed booking.

### GET /reviews/operator/{operatorId} — PUBLIC
→ 200 `{ "operatorId":1, "rating":4.5, "reviews":[ { "id":1,"passengerName":"...","rating":5,"comment":"...","createdAt":"..." } ] }`

---

## 6. Conductor (ROLE_CONDUCTOR)

### GET /conductor/trips — CONDUCTOR
Query: `date` (default today). → 200 `[ { "tripId":101,"route":"Colombo → Kandy","busReg":"ND-1234","departureTime":"06:00","status":"SCHEDULED","bookedSeats":30,"capacity":45 } ]`

### GET /conductor/trips/{tripId}/seats — CONDUCTOR
→ 200 same seat map shape as `GET /trips/{tripId}/seats` but includes `passengerName` on BOOKED seats.

### POST /conductor/manual-booking — CONDUCTOR
```json
{ "tripId":101, "seatNumbers":["12"], "passengerName":"Kasun Silva", "passengerMobile":"077...",
  "paymentMethod":"CASH", "amountPaid":1500.00, "boardingPointId":1, "dropoffPointId":4 }
```
→ 201 BookingResponse with `bookedVia:"MANUAL"`, `status:"CONFIRMED"` (cash already collected), ticket created.

### POST /conductor/trips/{tripId}/reconcile — CONDUCTOR
```json
{ "seatsSoldOnBoard": 3, "cashCollected": 4500.00, "notes": "All good" }
```
→ 200 `{ "message":"Reconciliation saved", "reconciliationId":1 }`

---

## 7. Operator (ROLE_OPERATOR — scoped to own operatorId)

### POST /operator/buses — OPERATOR
```json
{ "registrationNo":"ND-1234", "busType":"AC", "capacity":45, "amenities":["WiFi","Water","Charging","AC"],
  "model":"Kia Granbird", "year":2022 }
```
→ 201 bus object. `status` defaults ACTIVE.

### GET /operator/buses — OPERATOR → 200 `[bus...]`
### PUT /operator/buses/{id} — OPERATOR (own) → 200 updated bus
### DELETE /operator/buses/{id} — OPERATOR (own, only if no future trips) → 204

### POST /operator/routes — OPERATOR (route must be approved by ADMIN if new; existing routes reused)
```json
{ "fromCity":"Colombo","toCity":"Anuradhapura","distanceKm":206,"durationMin":300,
  "boardingPoints":[{"name":"Bastian Mawatha","city":"Colombo","timeOffsetMin":0},{"name":"Kurunegala","city":"Kurunegala","timeOffsetMin":130}] }
```
→ 201 route (status PENDING) or existing approved route.

### POST /operator/schedules — OPERATOR
```json
{ "routeId":3, "busId":5, "departureTime":"06:00", "arrivalTime":"09:30",
  "daysOfWeek":[1,2,3,4,5,6,7], "effectiveFrom":"2026-07-01", "effectiveTo":"2026-12-31" }
```
→ 201 schedule. Trips are generated lazily (on search) or pre-generated for next 7 days — implement lazy generation in TripService on search.

### GET /operator/schedules — OPERATOR → 200 `[schedule...]`
### PUT /operator/schedules/{id} — OPERATOR → 200 updated
### PUT /operator/schedules/{id}/deactivate — OPERATOR → 200 `{ "message":"Schedule deactivated" }`

### PUT /operator/fare-rules/{id} — OPERATOR
```json
{ "baseFare":1500.00, "perKmRate":0.0, "surgeMultiplier":1.0 }
```
→ 200 updated fare rule. Fare = baseFare + perKmRate * distanceKm.

### GET /operator/trips/occupancy — OPERATOR
Query: `from`,`to` (dates). → 200 `[ { "tripId":101,"date":"2026-07-17","route":"Colombo → Kandy","departureTime":"06:00","booked":30,"capacity":45,"occupancyPct":66.7,"revenue":45000.00 } ]`

### GET /operator/reports/revenue — OPERATOR
Query: `from`,`to`. → 200 `{ "totalRevenue": 120000.00, "totalBookings": 80, "avgFare": 1500.00, "daily": [ { "date":"2026-07-01","revenue":40000.00,"bookings":25 } ] }`

### GET /operator/reports/trips — OPERATOR
Query: `from`,`to`. → 200 `{ "totalTrips": 42, "cancelledTrips": 2, "completedTrips": 38, "averageOccupancyPct": 71.5 }`

### POST /operator/trips/{tripId}/delay — OPERATOR (notify passengers)
```json
{ "delayMinutes": 30, "reason": "Traffic" }
```
→ 200 `{ "message":"Passengers notified", "notified": 25 }`

---

## 8. Admin (ROLE_ADMIN)

### GET /admin/operators — ADMIN · Query: `status` (PENDING|APPROVED|...)
→ 200 `[ { "id":1,"name":"...","registrationNo":"...","status":"PENDING","ownerName":"...","createdAt":"..." } ]`

### POST /admin/operators/{id}/approve — ADMIN → 200 `{ "message":"Operator approved" }`
### POST /admin/operators/{id}/reject — ADMIN body `{ "reason":"..." }` → 200
### POST /admin/operators/{id}/suspend — ADMIN body `{ "reason":"..." }` → 200

### GET /admin/users — ADMIN · Query: `role`,`q` → 200 `[user...]`
### PUT /admin/users/{id}/roles — ADMIN
```json
{ "roles": ["PASSENGER","OPERATOR"] }
```
→ 200 user.

### GET /admin/audit-logs — ADMIN · Query: `page`,`size` → 200 `{ "content":[ { "id":1,"actorId":1,"action":"CREATE_BOOKING","entityType":"Booking","entityId":"VY-...","details":"...","ipAddress":"127.0.0.1","createdAt":"..." } ], "totalElements":... }`

### GET /admin/complaints — ADMIN → 200 `[{ "id":1,"passengerName":"...","subject":"...","status":"OPEN","createdAt":"..." }]`
### PUT /admin/complaints/{id} — ADMIN
```json
{ "status":"RESOLVED", "resolution":"Refunded 150 LKR", "assignedTo": 2 }
```
→ 200 updated complaint.

### POST /admin/complaints — (also available to PASSENGER) — PASSENGER/ADMIN
```json
{ "bookingRef":"VY-...", "subject":"Late bus", "description":"..." }
```
→ 201 complaint.

### GET /admin/analytics/overview — ADMIN
→ 200 `{ "totalBookings": 1200, "totalRevenue": 1800000.00, "activeOperators": 25, "totalBuses": 140, "occupancyRate": 68.5, "pendingComplaints": 3 }`

### GET /admin/analytics/occupancy-trend — ADMIN
Query: `days` (default 30). → 200 `[ { "date":"2026-07-01","occupancyPct":72.3 } ]`

### GET /admin/analytics/revenue — ADMIN
Query: `days`. → 200 `[ { "date":"2026-07-01","revenue":58000.00,"bookings":38 } ]`

### GET /admin/analytics/demand-forecast — ADMIN
Query: `fromCity`,`toCity`,`days` (default 14). → 200 `[ { "date":"2026-07-18","forecastedBookings":42,"recommendedFare":1580.00 } ]`
Simple model: exponential smoothing on last `days` of bookings for that route + day-of-week factor + fare suggestion.

---

## 9. Notifications & Misc

### GET /notifications — any authenticated (own) → 200 `[ { "id":1,"channel":"EMAIL","subject":"Booking confirmed","body":"...","status":"SENT","sentAt":"..." } ]`
### GET /notifications/{id} — any authenticated (own) → 200
### PUT /notifications/{id}/read — any authenticated → 200 `{ "message":"Marked read" }`

### GET /health — PUBLIC → 200 `{ "status":"UP", "timestamp":"..." }`

---

## Auth matrix summary
| Endpoint prefix | Roles |
|---|---|
| /auth/**, /buses/**, /trips/*/seats, /routes, /operators/public, /reviews/operator/**, /tickets/*/qr, /health | PUBLIC (reviews POST requires PASSENGER) |
| /bookings/**, /payments/**, /tickets/**, /reviews, /notifications/** | PASSENGER (+ owner checks) |
| /conductor/** | CONDUCTOR |
| /operator/** | OPERATOR (+ ownership) |
| /admin/** | ADMIN |
| /analytics/** | ADMIN (advanced analytics) |

## Seed expectations (DataInitializer)
- Roles: PASSENGER, OPERATOR, CONDUCTOR, ADMIN.
- Users (BCrypt "password123"): `admin@vygo.lk` (ADMIN), `operator@vygo.lk` (OPERATOR, operator "Lanka Express"), `conductor@vygo.lk` (CONDUCTOR), `nimal@vygo.lk` / mobile `0712345678` (PASSENGER).
- 3+ operators, 6+ buses (types NORMAL/SEMI_LUXURY/LUXURY/AC), routes: Colombo–Kandy, Colombo–Galle, Colombo–Jaffna, Kandy–Galle, Galle–Jaffna, Colombo–Anuradhapura.
- Schedules with today's + next 6 days trips pre-generated.
- A few seats BOOKED on some trips so the seat map demos nicely.
- OTP dev value `123456` for any mobile.

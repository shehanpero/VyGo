-- VyGo — MySQL 8 canonical schema
-- Run: mysql -u root -p < database/schema.sql
CREATE DATABASE IF NOT EXISTS vygo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vygo;

-- ---------------------------------------------------------------------------
-- Identity & Roles
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  code       VARCHAR(30)  NOT NULL,              -- PASSENGER | OPERATOR | CONDUCTOR | ADMIN
  name       VARCHAR(60)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_roles_code (code)
) ENGINE=InnoDB;

CREATE TABLE users (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(150) DEFAULT NULL,
  mobile        VARCHAR(20)  NOT NULL,
  password_hash VARCHAR(100) DEFAULT NULL,
  otp_code      VARCHAR(6)   DEFAULT NULL,
  otp_expires_at DATETIME    DEFAULT NULL,
  otp_verified  BOOLEAN      DEFAULT FALSE,
  enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
  profile_image_url VARCHAR(300) DEFAULT NULL,
  mobile_verified   BOOLEAN   DEFAULT FALSE,
  id_type       VARCHAR(20)  DEFAULT NULL,
  id_number     VARCHAR(60)  DEFAULT NULL,
  id_front_url  VARCHAR(300) DEFAULT NULL,
  id_back_url   VARCHAR(300) DEFAULT NULL,
  license_url   VARCHAR(300) DEFAULT NULL,
  business_doc_url VARCHAR(300) DEFAULT NULL,
  selfie_url    VARCHAR(300) DEFAULT NULL,
  face_match_score DOUBLE    DEFAULT NULL,
  liveness_passed  BOOLEAN   DEFAULT NULL,
  liveness_actions VARCHAR(120) DEFAULT NULL,
  spoof_passed     BOOLEAN   DEFAULT NULL,
  verification_status VARCHAR(20) DEFAULT 'UNVERIFIED',
  verification_note   VARCHAR(300) DEFAULT NULL,
  submitted_at  DATETIME     DEFAULT NULL,
  verified_at   DATETIME     DEFAULT NULL,
  owner_id      BIGINT       DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  UNIQUE KEY uk_users_mobile (mobile)
) ENGINE=InnoDB;

CREATE TABLE user_roles (
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Fleet
-- ---------------------------------------------------------------------------
CREATE TABLE bus_operators (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  user_id         BIGINT       NOT NULL,         -- owner user (role OPERATOR)
  name            VARCHAR(150) NOT NULL,
  registration_no VARCHAR(60)  NOT NULL,
  license_no      VARCHAR(60)  DEFAULT NULL,
  address         VARCHAR(255) DEFAULT NULL,
  contact_person  VARCHAR(120) DEFAULT NULL,
  phone           VARCHAR(20)  DEFAULT NULL,
  email           VARCHAR(150) DEFAULT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',  -- PENDING|APPROVED|REJECTED|SUSPENDED
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bo_user (user_id),
  UNIQUE KEY uk_bo_reg (registration_no),
  CONSTRAINT fk_bo_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE buses (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  operator_id     BIGINT       NOT NULL,
  registration_no VARCHAR(20)  NOT NULL,         -- e.g. ND-1234
  bus_type        VARCHAR(20)  NOT NULL,         -- NORMAL|SEMI_LUXURY|LUXURY|AC
  capacity        INT          NOT NULL,
  amenities       JSON         DEFAULT NULL,     -- ["WiFi","Water","Charging","AC"]
  model           VARCHAR(100) DEFAULT NULL,
  manufacture_year INT        DEFAULT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE|MAINTENANCE|INACTIVE
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_buses_reg (registration_no),
  CONSTRAINT fk_bus_operator FOREIGN KEY (operator_id) REFERENCES bus_operators (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Routes, pricing, scheduling
-- ---------------------------------------------------------------------------
CREATE TABLE routes (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  route_number    VARCHAR(20)  DEFAULT NULL,        -- NTC code e.g. '01', 'EX 1-1', 'A-Bay'
  from_city       VARCHAR(80)  NOT NULL,
  to_city         VARCHAR(80)  NOT NULL,
  route_type      VARCHAR(20)  NOT NULL DEFAULT 'NORMAL',  -- NORMAL|EXPRESSWAY
  expressway_code VARCHAR(20)  DEFAULT NULL,        -- E001|E003|E004
  route_class     VARCHAR(20)  DEFAULT NULL,        -- CITY|SUBURBAN|INTERCITY|LONG_DISTANCE
  distance_km     DECIMAL(8,2) NOT NULL,
  duration_min    INT          NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'APPROVED',  -- PENDING|APPROVED|REJECTED
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_routes_from_to (from_city, to_city),
  KEY idx_routes_type (route_type),
  KEY idx_routes_number (route_number)
) ENGINE=InnoDB;

CREATE TABLE boarding_points (
  id               BIGINT       NOT NULL AUTO_INCREMENT,
  route_id         BIGINT       NOT NULL,
  name             VARCHAR(120) NOT NULL,
  sequence         INT          NOT NULL,
  city             VARCHAR(80)  DEFAULT NULL,
  lat              DECIMAL(10,6) DEFAULT NULL,
  lng              DECIMAL(10,6) DEFAULT NULL,
  time_offset_min  INT          NOT NULL DEFAULT 0,   -- minutes after departure
  PRIMARY KEY (id),
  CONSTRAINT fk_bp_route FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE fare_rules (
  id              BIGINT        NOT NULL AUTO_INCREMENT,
  route_id        BIGINT        NOT NULL,
  bus_type        VARCHAR(20)   NOT NULL,
  base_fare       DECIMAL(10,2) NOT NULL,
  per_km_rate     DECIMAL(6,2)  NOT NULL DEFAULT 0.00,
  surge_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (id),
  UNIQUE KEY uk_fare_route_type (route_id, bus_type),
  CONSTRAINT fk_fare_route FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE schedules (
  id              BIGINT      NOT NULL AUTO_INCREMENT,
  route_id        BIGINT      NOT NULL,
  bus_id          BIGINT      NOT NULL,
  operator_id     BIGINT      NOT NULL,
  departure_time  TIME        NOT NULL,
  arrival_time    TIME        NOT NULL,
  days_of_week    VARCHAR(30) NOT NULL DEFAULT '1,2,3,4,5,6,7',   -- CSV of 1..7 (Mon..Sun)
  effective_from  DATE        NOT NULL,
  effective_to    DATE        DEFAULT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE|DEACTIVATED
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_sch_route   FOREIGN KEY (route_id)   REFERENCES routes (id),
  CONSTRAINT fk_sch_bus     FOREIGN KEY (bus_id)     REFERENCES buses (id),
  CONSTRAINT fk_sch_operator FOREIGN KEY (operator_id) REFERENCES bus_operators (id)
) ENGINE=InnoDB;

CREATE TABLE trips (
  id            BIGINT      NOT NULL AUTO_INCREMENT,
  schedule_id   BIGINT      NOT NULL,
  trip_date     DATE        NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',  -- SCHEDULED|ON_TIME|DELAYED|DEPARTED|COMPLETED|CANCELLED
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_trip_sched_date (schedule_id, trip_date),
  CONSTRAINT fk_trip_schedule FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Seats & bookings
-- ---------------------------------------------------------------------------
CREATE TABLE seat_inventory (
  id             BIGINT        NOT NULL AUTO_INCREMENT,
  trip_id        BIGINT        NOT NULL,
  seat_number    VARCHAR(10)   NOT NULL,
  status         VARCHAR(20)   NOT NULL DEFAULT 'AVAILABLE',  -- AVAILABLE|LOCKED|BOOKED
  lock_owner     BIGINT        DEFAULT NULL,                  -- user id who locked
  lock_expires_at DATETIME     DEFAULT NULL,
  booking_id     BIGINT        DEFAULT NULL,
  price          DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_seat_trip_seat (trip_id, seat_number),
  CONSTRAINT fk_seat_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE bookings (
  id               BIGINT        NOT NULL AUTO_INCREMENT,
  booking_ref      VARCHAR(24)   NOT NULL,
  passenger_id     BIGINT        NOT NULL,
  trip_id          BIGINT        NOT NULL,
  status           VARCHAR(20)   NOT NULL DEFAULT 'PENDING',  -- PENDING|CONFIRMED|CANCELLED|COMPLETED
  seats_count      INT           NOT NULL,
  total_fare       DECIMAL(10,2) NOT NULL,
  boarding_point_id BIGINT       NOT NULL,
  dropoff_point_id BIGINT        NOT NULL,
  booked_via       VARCHAR(10)   NOT NULL DEFAULT 'ONLINE',   -- ONLINE|MANUAL
  created_by       BIGINT        DEFAULT NULL,
  cancelled_at     DATETIME      DEFAULT NULL,
  cancellation_reason VARCHAR(255) DEFAULT NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bookings_ref (booking_ref),
  KEY idx_bookings_passenger (passenger_id),
  KEY idx_bookings_trip (trip_id),
  CONSTRAINT fk_booking_passenger FOREIGN KEY (passenger_id) REFERENCES users (id),
  CONSTRAINT fk_booking_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
  CONSTRAINT fk_booking_bp FOREIGN KEY (boarding_point_id) REFERENCES boarding_points (id),
  CONSTRAINT fk_booking_dp FOREIGN KEY (dropoff_point_id) REFERENCES boarding_points (id)
) ENGINE=InnoDB;

CREATE TABLE booking_seats (
  id         BIGINT        NOT NULL AUTO_INCREMENT,
  booking_id BIGINT        NOT NULL,
  trip_id    BIGINT        NOT NULL,
  seat_number VARCHAR(10)  NOT NULL,
  price      DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_bs_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Payments, refunds, tickets
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
  id             BIGINT        NOT NULL AUTO_INCREMENT,
  booking_id     BIGINT        NOT NULL,
  gateway_txn_id VARCHAR(40)   NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  currency       VARCHAR(3)    NOT NULL DEFAULT 'LKR',
  method         VARCHAR(20)   NOT NULL,              -- CARD|WALLET|CASH
  gateway        VARCHAR(30)   NOT NULL DEFAULT 'PAYHERE_SANDBOX',  -- PAYHERE_SANDBOX|CASH
  status         VARCHAR(20)   NOT NULL DEFAULT 'PENDING',  -- PENDING|SUCCESS|FAILED|REFUND_PENDING|REFUNDED
  paid_at        DATETIME      DEFAULT NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_payments_txn (gateway_txn_id),
  CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings (id)
) ENGINE=InnoDB;

CREATE TABLE refunds (
  id           BIGINT        NOT NULL AUTO_INCREMENT,
  payment_id   BIGINT        NOT NULL,
  booking_id   BIGINT        NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,
  reason       VARCHAR(255)  DEFAULT NULL,
  status       VARCHAR(20)   NOT NULL DEFAULT 'PENDING',  -- PENDING|COMPLETED|FAILED
  processed_at DATETIME      DEFAULT NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_refund_payment FOREIGN KEY (payment_id) REFERENCES payments (id),
  CONSTRAINT fk_refund_booking FOREIGN KEY (booking_id) REFERENCES bookings (id)
) ENGINE=InnoDB;

CREATE TABLE tickets (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  booking_id     BIGINT       NOT NULL,
  ticket_ref     VARCHAR(24)  NOT NULL,
  passenger_name VARCHAR(120) NOT NULL,
  seat_number    VARCHAR(10)  NOT NULL,
  qr_content     TEXT         NOT NULL,
  qr_code_url    VARCHAR(255) DEFAULT NULL,
  status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE|USED|CANCELLED
  validated_by   BIGINT       DEFAULT NULL,
  validated_at   DATETIME     DEFAULT NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tickets_ref (ticket_ref),
  CONSTRAINT fk_ticket_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Engagement & operations
-- ---------------------------------------------------------------------------
CREATE TABLE reviews (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  booking_id   BIGINT       NOT NULL,
  passenger_id BIGINT       NOT NULL,
  operator_id  BIGINT       NOT NULL,
  trip_id      BIGINT       DEFAULT NULL,
  rating       INT          NOT NULL,
  comment      VARCHAR(500) DEFAULT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_review_booking (booking_id),
  CONSTRAINT fk_review_booking   FOREIGN KEY (booking_id)   REFERENCES bookings (id),
  CONSTRAINT fk_review_passenger FOREIGN KEY (passenger_id) REFERENCES users (id),
  CONSTRAINT fk_review_operator  FOREIGN KEY (operator_id)  REFERENCES bus_operators (id)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  user_id    BIGINT       NOT NULL,
  channel    VARCHAR(10)  NOT NULL,               -- EMAIL|SMS
  subject    VARCHAR(200) DEFAULT NULL,
  body       TEXT         DEFAULT NULL,
  status     VARCHAR(10)  NOT NULL DEFAULT 'PENDING',  -- PENDING|SENT|FAILED
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  sent_at    DATETIME     DEFAULT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  actor_id    BIGINT       DEFAULT NULL,
  action      VARCHAR(60)  NOT NULL,
  entity_type VARCHAR(60)  DEFAULT NULL,
  entity_id   VARCHAR(60)  DEFAULT NULL,
  details     VARCHAR(500) DEFAULT NULL,
  ip_address  VARCHAR(45)  DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_actor (actor_id),
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE complaints (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  passenger_id BIGINT      NOT NULL,
  booking_id  BIGINT       DEFAULT NULL,
  subject     VARCHAR(200) NOT NULL,
  description TEXT         DEFAULT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'OPEN',   -- OPEN|IN_PROGRESS|RESOLVED|CLOSED
  resolution  VARCHAR(500) DEFAULT NULL,
  assigned_to BIGINT       DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_complaint_passenger FOREIGN KEY (passenger_id) REFERENCES users (id),
  CONSTRAINT fk_complaint_booking   FOREIGN KEY (booking_id)   REFERENCES bookings (id)
) ENGINE=InnoDB;

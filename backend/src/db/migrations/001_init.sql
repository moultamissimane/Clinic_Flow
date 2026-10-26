-- ClinicFlow — initial schema
-- Extensions -----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- trigram indexes for ILIKE '%search%'
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- uuid equality inside a GiST exclusion constraint

-- Enums ----------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'staff');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- updated_at trigger ---------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- users ----------------------------------------------------------------------
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     varchar(120) NOT NULL,
  email         varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'staff',
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- patients -------------------------------------------------------------------
CREATE TABLE patients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  varchar(150) NOT NULL,
  cin        varchar(20)  NOT NULL,
  phone      varchar(20)  NOT NULL,
  birth_date date         NOT NULL,
  address    text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT patients_cin_key UNIQUE (cin),
  CONSTRAINT patients_full_name_not_blank CHECK (length(btrim(full_name)) >= 2),
  CONSTRAINT patients_birth_date_range CHECK (birth_date >= DATE '1900-01-01')
);

-- Search (fullName / CIN) uses ILIKE '%term%': trigram GIN indexes serve it.
CREATE INDEX patients_full_name_trgm_idx ON patients USING gin (full_name gin_trgm_ops);
CREATE INDEX patients_cin_trgm_idx       ON patients USING gin (cin gin_trgm_ops);
-- Default listing: active patients, newest first.
CREATE INDEX patients_active_created_idx ON patients (created_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER patients_set_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- appointments ---------------------------------------------------------------
CREATE TABLE appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_date timestamptz        NOT NULL,
  status           appointment_status NOT NULL DEFAULT 'pending',
  reason           varchar(255)       NOT NULL,
  notes            text,
  created_by       uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at       timestamptz        NOT NULL DEFAULT now(),
  updated_at       timestamptz        NOT NULL DEFAULT now()
);

CREATE INDEX appointments_date_idx         ON appointments (appointment_date);
CREATE INDEX appointments_patient_date_idx ON appointments (patient_id, appointment_date);
CREATE INDEX appointments_status_date_idx  ON appointments (status, appointment_date);
CREATE INDEX appointments_created_by_idx   ON appointments (created_by);

CREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Business rule, enforced by the database itself:
-- a patient cannot have two CONFIRMED appointments less than 30 minutes apart.
-- Each confirmed appointment occupies [date, date + 30min); two such ranges
-- overlap exactly when |date1 - date2| < 30 minutes.
-- (timestamptz + interval is only STABLE, hence the IMMUTABLE wrapper: a fixed
-- 30-minute interval does not depend on the session time zone.)
CREATE OR REPLACE FUNCTION appointment_slot(ts timestamptz) RETURNS tstzrange
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
BEGIN
  RETURN tstzrange(ts, ts + interval '30 minutes', '[)');
END;
$$;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_confirmed_overlap
  EXCLUDE USING gist (patient_id WITH =, appointment_slot(appointment_date) WITH &&)
  WHERE (status = 'confirmed');

-- audit_logs -----------------------------------------------------------------
CREATE TABLE audit_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  action     varchar(50) NOT NULL,
  entity     varchar(50) NOT NULL,
  entity_id  uuid,
  payload    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_entity_idx  ON audit_logs (entity, entity_id);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);

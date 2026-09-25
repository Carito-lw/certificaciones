-- A student can receive only one credential for a given course enrollment.
-- Retry and concurrent batch attempts must never make a second credential.
create unique index credentials_enrollment_unique on credentials (institution_id, enrollment_id);

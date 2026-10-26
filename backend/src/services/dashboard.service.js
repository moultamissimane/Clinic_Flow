const env = require('../config/env');
const { query } = require('../db/pool');
const { todayInTimezone } = require('../utils/dates');

// All counters in one round trip. "Today" is the current day in the clinic's
// time zone; pending/confirmed are counted over all non-archived patients.
async function getStats() {
  const today = todayInTimezone(env.timezone);
  const { rows } = await query(
    `WITH bounds AS (
       SELECT ($1::date)::timestamp AT TIME ZONE $2       AS day_start,
              ($1::date + 1)::timestamp AT TIME ZONE $2   AS day_end,
              date_trunc('month', $1::date)::timestamp AT TIME ZONE $2 AS month_start
     )
     SELECT
       (SELECT count(*) FROM patients WHERE deleted_at IS NULL)::int AS total_patients,
       (SELECT count(*) FROM patients, bounds
         WHERE deleted_at IS NULL AND created_at >= bounds.month_start)::int AS new_patients_this_month,
       count(*) FILTER (WHERE a.appointment_date >= b.day_start AND a.appointment_date < b.day_end)::int AS today_total,
       count(*) FILTER (WHERE a.appointment_date >= b.day_start AND a.appointment_date < b.day_end
                          AND a.status = 'pending')::int   AS today_pending,
       count(*) FILTER (WHERE a.appointment_date >= b.day_start AND a.appointment_date < b.day_end
                          AND a.status = 'confirmed')::int AS today_confirmed,
       count(*) FILTER (WHERE a.appointment_date >= b.day_start AND a.appointment_date < b.day_end
                          AND a.status = 'cancelled')::int AS today_cancelled,
       count(*) FILTER (WHERE a.status = 'pending')::int   AS pending,
       count(*) FILTER (WHERE a.status = 'confirmed')::int AS confirmed,
       count(*) FILTER (WHERE a.status = 'cancelled')::int AS cancelled
     FROM bounds b
     LEFT JOIN appointments a ON true
     LEFT JOIN patients p ON p.id = a.patient_id
     WHERE a.id IS NULL OR p.deleted_at IS NULL`,
    [today, env.timezone],
  );
  const r = rows[0];

  return {
    date: today,
    timezone: env.timezone,
    totalPatients: r.total_patients,
    newPatientsThisMonth: r.new_patients_this_month,
    todayAppointments: r.today_total,
    pending: r.pending,
    confirmed: r.confirmed,
    cancelled: r.cancelled,
    today: { pending: r.today_pending, confirmed: r.today_confirmed, cancelled: r.today_cancelled },
  };
}

module.exports = { getStats };

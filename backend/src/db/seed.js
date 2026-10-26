// Seed: 1 admin, 2 staff, 5 patients, 10 appointments (mix of statuses).
// Appointments are placed relative to today so the dashboard always has data.
// Re-running the seed wipes and recreates all business data.
const bcrypt = require('bcrypt');
const { pool, withTransaction } = require('./pool');
const env = require('../config/env');
const { todayInTimezone } = require('../utils/dates');

const users = [
  { fullName: 'Dr. Yassine Alami', email: 'admin@clinicflow.ma', password: 'Admin@123', role: 'admin' },
  { fullName: 'Salma Idrissi', email: 'staff1@clinicflow.ma', password: 'Staff@123', role: 'staff' },
  { fullName: 'Omar Tazi', email: 'staff2@clinicflow.ma', password: 'Staff@123', role: 'staff' },
];

const patients = [
  { fullName: 'Youssef El Amrani', cin: 'AB654321', phone: '0661234567', birthDate: '1984-05-14', address: '24 Rue Ibn Sina, Guéliz, Marrakech' },
  { fullName: 'Salma Bennani', cin: 'BE789012', phone: '0662890123', birthDate: '1990-03-22', address: '7 Avenue Hassan II, Rabat' },
  { fullName: 'Karim Alaoui', cin: 'K345678', phone: '0670456789', birthDate: '1976-11-02', address: null },
  { fullName: 'Fatima Zahra Chraibi', cin: 'BJ112233', phone: '0665112233', birthDate: '1995-07-30', address: '14 Bd Zerktouni, Casablanca' },
  { fullName: 'Mehdi Benjelloun', cin: 'EE998877', phone: '0663998877', birthDate: '2001-01-18', address: 'Résidence Al Andalous, Fès' },
];

// [patientIndex, dayOffset, time, status, reason, notes, createdByIndex]
const appointments = [
  [0, 0, '09:00', 'confirmed', 'Consultation cardiologie', 'Contrôle ECG et ajustement traitement', 0],
  [1, 0, '09:45', 'pending', 'Contrôle tension', null, 1],
  [2, 0, '10:30', 'confirmed', 'Bilan annuel', null, 1],
  [3, 0, '11:15', 'confirmed', 'Consultation générale', null, 2],
  [4, 0, '12:00', 'cancelled', 'Douleur abdominale', 'Annulé par le patient', 2],
  [0, 1, '14:30', 'pending', 'Suivi tension', null, 1],
  [1, 2, '10:00', 'confirmed', 'Résultats analyses', 'Apporter le bilan biologique', 0],
  [2, -3, '16:00', 'cancelled', 'Consultation dermatologie', null, 2],
  [3, -1, '09:30', 'confirmed', 'Vaccination', null, 1],
  [4, 3, '15:00', 'pending', 'Première consultation', 'Nouveau patient', 2],
];

async function seed() {
  const today = todayInTimezone(env.timezone);

  await withTransaction(async (client) => {
    await client.query('TRUNCATE audit_logs, appointments, patients, users CASCADE');

    const userIds = [];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      const { rows } = await client.query(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [u.fullName, u.email, hash, u.role],
      );
      userIds.push(rows[0].id);
    }

    const patientIds = [];
    for (const p of patients) {
      const { rows } = await client.query(
        `INSERT INTO patients (full_name, cin, phone, birth_date, address, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [p.fullName, p.cin, p.phone, p.birthDate, p.address, userIds[0]],
      );
      patientIds.push(rows[0].id);
    }

    for (const [pIdx, dayOffset, time, status, reason, notes, uIdx] of appointments) {
      await client.query(
        `INSERT INTO appointments (patient_id, appointment_date, status, reason, notes, created_by)
         VALUES ($1, (($2::date + $3::int) + $4::time) AT TIME ZONE $5, $6, $7, $8, $9)`,
        [patientIds[pIdx], today, dayOffset, time, env.timezone, status, reason, notes, userIds[uIdx]],
      );
    }
  });

  console.log('✓ seed done');
  console.log('  admin  → admin@clinicflow.ma / Admin@123');
  console.log('  staff  → staff1@clinicflow.ma / Staff@123, staff2@clinicflow.ma / Staff@123');
}

if (require.main === module) {
  seed()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { seed };

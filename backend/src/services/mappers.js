// DB rows (snake_case) → API objects (camelCase). password_hash never leaves this layer.

const toUser = (r) => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
  role: r.role,
  isActive: r.is_active,
  createdAt: r.created_at,
});

const toPatient = (r) => ({
  id: r.id,
  fullName: r.full_name,
  cin: r.cin,
  phone: r.phone,
  birthDate: r.birth_date,
  address: r.address,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  ...(r.created_by_name !== undefined && { createdByName: r.created_by_name }),
  ...(r.next_appointment !== undefined && { nextAppointment: r.next_appointment }),
  ...(r.appointment_count !== undefined && { appointmentCount: Number(r.appointment_count) }),
});

const toAppointment = (r) => ({
  id: r.id,
  patientId: r.patient_id,
  appointmentDate: r.appointment_date,
  status: r.status,
  reason: r.reason,
  notes: r.notes,
  createdBy: r.created_by,
  createdByName: r.created_by_name,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  patient: { id: r.patient_id, fullName: r.patient_full_name, cin: r.patient_cin, phone: r.patient_phone },
});

module.exports = { toUser, toPatient, toAppointment };

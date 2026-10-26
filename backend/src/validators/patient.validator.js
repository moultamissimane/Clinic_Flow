const { z, pagination, isoDate, emptyToUndefined } = require('./common');

// Moroccan CIN: 1–2 letters followed by digits (e.g. AB123456, K345678).
const cin = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{1,2}\d{3,8}$/, 'CIN invalide (ex : AB123456)');

// Moroccan phone: 0X XXXXXXXX or +212 X XXXXXXXX; spaces, dots and dashes are ignored.
const phone = z
  .string()
  .transform((s) => s.replace(/[\s.-]/g, ''))
  .pipe(z.string().regex(/^(\+212|0)[5-7]\d{8}$/, 'Téléphone invalide (ex : 0612345678)'));

const birthDate = isoDate
  .refine((s) => s >= '1900-01-01', 'Date de naissance invalide')
  .refine((s) => s <= new Date().toISOString().slice(0, 10), 'La date de naissance ne peut pas être dans le futur');

// PUT replaces the whole resource, so create and update share one schema.
const patientBody = z.object({
  fullName: z.string().trim().min(2, 'Nom complet requis (2 caractères min.)').max(150),
  cin,
  phone,
  birthDate,
  address: emptyToUndefined(z.string().trim().max(500).optional()),
});

const listQuery = z.object({
  search: emptyToUndefined(z.string().trim().max(100).optional()),
  ...pagination,
});

module.exports = { create: patientBody, update: patientBody, listQuery };

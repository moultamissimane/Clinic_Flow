const { z } = require('zod');

const uuidParam = z.object({ id: z.string().uuid('Identifiant invalide') });

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

// YYYY-MM-DD that is also a real calendar date (rejects 2026-02-30).
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format attendu : AAAA-MM-JJ')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, 'Date invalide');

// Treats "" (empty query param / form field) and null as "not provided".
const emptyToUndefined = (schema) => z.preprocess((v) => (v === '' || v === null ? undefined : v), schema);

module.exports = { z, uuidParam, pagination, isoDate, emptyToUndefined };

const { z, emptyToUndefined } = require('./common');

const password = z
  .string()
  .min(8, '8 caractères minimum')
  .max(128)
  .regex(/[A-Za-z]/, 'Doit contenir une lettre')
  .regex(/\d/, 'Doit contenir un chiffre');

const create = z.object({
  fullName: z.string().trim().min(2, 'Nom requis').max(120),
  email: z.string().trim().toLowerCase().email('Email invalide'),
  password,
  role: z.enum(['admin', 'staff']).default('staff'),
});

const update = z
  .object({
    fullName: emptyToUndefined(z.string().trim().min(2).max(120).optional()),
    role: z.enum(['admin', 'staff']).optional(),
    isActive: z.boolean().optional(),
    password: emptyToUndefined(password.optional()),
  })
  .refine((o) => Object.values(o).some((v) => v !== undefined), 'Aucune modification fournie');

module.exports = { create, update };

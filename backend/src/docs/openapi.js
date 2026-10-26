// OpenAPI 3 description served by swagger-ui at /api/docs.
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ content: { 'application/json': { schema } } });
const error = (description) => ({ description, ...json(ref('Error')) });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };

const listOf = (item) => ({
  type: 'object',
  properties: { data: { type: 'array', items: ref(item) }, meta: ref('PageMeta') },
});
const one = (item) => ({ type: 'object', properties: { data: ref(item) } });

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'ClinicFlow API',
    version: '1.0.0',
    description: 'Gestion patients & rendez-vous. Authentifiez-vous via POST /api/auth/login puis « Authorize » avec le token.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
            },
          },
        },
      },
      PageMeta: {
        type: 'object',
        properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'staff'] },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PatientInput: {
        type: 'object',
        required: ['fullName', 'cin', 'phone', 'birthDate'],
        properties: {
          fullName: { type: 'string', example: 'Houda Mansouri' },
          cin: { type: 'string', example: 'AB123456' },
          phone: { type: 'string', example: '0612345678' },
          birthDate: { type: 'string', format: 'date', example: '1988-06-15' },
          address: { type: 'string', nullable: true, example: '14 Bd Zerktouni, Casablanca' },
        },
      },
      Patient: {
        allOf: [
          ref('PatientInput'),
          {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              nextAppointment: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        ],
      },
      AppointmentInput: {
        type: 'object',
        required: ['patientId', 'appointmentDate', 'reason'],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
          appointmentDate: { type: 'string', format: 'date-time', example: '2026-10-27T10:00:00+01:00' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
          reason: { type: 'string', example: 'Consultation de contrôle' },
          notes: { type: 'string', nullable: true },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          appointmentDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] },
          reason: { type: 'string' },
          notes: { type: 'string', nullable: true },
          createdBy: { type: 'string', format: 'uuid' },
          createdByName: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          patient: {
            type: 'object',
            properties: { id: { type: 'string' }, fullName: { type: 'string' }, cin: { type: 'string' }, phone: { type: 'string' } },
          },
        },
      },
      Stats: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date' },
          totalPatients: { type: 'integer' },
          newPatientsThisMonth: { type: 'integer' },
          todayAppointments: { type: 'integer' },
          pending: { type: 'integer' },
          confirmed: { type: 'integer' },
          cancelled: { type: 'integer' },
          today: {
            type: 'object',
            properties: { pending: { type: 'integer' }, confirmed: { type: 'integer' }, cancelled: { type: 'integer' } },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        security: [],
        summary: 'Connexion (email + mot de passe) → JWT',
        requestBody: json({
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'admin@clinicflow.ma' },
            password: { type: 'string', example: 'Admin@123' },
          },
        }),
        responses: {
          200: { description: 'OK', ...json({ type: 'object', properties: { token: { type: 'string' }, user: ref('User') } }) },
          400: error('Validation'),
          401: error('Identifiants incorrects'),
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Utilisateur connecté',
        responses: { 200: { description: 'OK', ...json({ type: 'object', properties: { user: ref('User') } }) }, 401: error('Non authentifié') },
      },
    },
    '/patients': {
      get: {
        tags: ['Patients'],
        summary: 'Liste paginée + recherche (nom complet / CIN)',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 100 } },
        ],
        responses: { 200: { description: 'OK', ...json(listOf('Patient')) }, 401: error('Non authentifié') },
      },
      post: {
        tags: ['Patients'],
        summary: 'Créer un patient',
        requestBody: json(ref('PatientInput')),
        responses: { 201: { description: 'Créé', ...json(one('Patient')) }, 400: error('Validation'), 409: error('CIN déjà utilisé') },
      },
    },
    '/patients/{id}': {
      parameters: [idParam],
      get: { tags: ['Patients'], summary: 'Détail patient', responses: { 200: { description: 'OK', ...json(one('Patient')) }, 404: error('Introuvable') } },
      put: {
        tags: ['Patients'],
        summary: 'Modifier un patient',
        requestBody: json(ref('PatientInput')),
        responses: { 200: { description: 'OK', ...json(one('Patient')) }, 400: error('Validation'), 404: error('Introuvable'), 409: error('CIN déjà utilisé') },
      },
      delete: {
        tags: ['Patients'],
        summary: 'Archiver un patient (soft delete) — admin uniquement',
        responses: { 204: { description: 'Supprimé' }, 403: error('Réservé admin'), 404: error('Introuvable') },
      },
    },
    '/appointments': {
      get: {
        tags: ['Appointments'],
        summary: 'Liste filtrée (date, statut, patient)',
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Jour (fuseau de la clinique)' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] } },
          { name: 'patientId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: { 200: { description: 'OK', ...json(listOf('Appointment')) } },
      },
      post: {
        tags: ['Appointments'],
        summary: 'Créer un rendez-vous',
        requestBody: json(ref('AppointmentInput')),
        responses: {
          201: { description: 'Créé', ...json(one('Appointment')) },
          400: error('Validation'),
          404: error('Patient introuvable'),
          409: error('Conflit : rendez-vous confirmé à moins de 30 minutes'),
        },
      },
    },
    '/appointments/{id}': {
      parameters: [idParam],
      get: { tags: ['Appointments'], summary: 'Détail rendez-vous', responses: { 200: { description: 'OK', ...json(one('Appointment')) }, 404: error('Introuvable') } },
    },
    '/appointments/{id}/status': {
      parameters: [idParam],
      patch: {
        tags: ['Appointments'],
        summary: 'Changer le statut',
        requestBody: json({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] } } }),
        responses: {
          200: { description: 'OK', ...json(one('Appointment')) },
          400: error('Validation'),
          404: error('Introuvable'),
          409: error('Conflit : rendez-vous confirmé à moins de 30 minutes'),
        },
      },
    },
    '/dashboard/stats': {
      get: { tags: ['Dashboard'], summary: 'Statistiques', responses: { 200: { description: 'OK', ...json(one('Stats')) } } },
    },
    '/users': {
      get: { tags: ['Users'], summary: 'Liste des utilisateurs (admin)', responses: { 200: { description: 'OK' }, 403: error('Réservé admin') } },
      post: {
        tags: ['Users'],
        summary: 'Créer un utilisateur (admin)',
        requestBody: json({
          type: 'object',
          required: ['fullName', 'email', 'password'],
          properties: {
            fullName: { type: 'string' },
            email: { type: 'string' },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['admin', 'staff'] },
          },
        }),
        responses: { 201: { description: 'Créé' }, 400: error('Validation'), 403: error('Réservé admin'), 409: error('Email déjà utilisé') },
      },
    },
    '/users/{id}': {
      parameters: [idParam],
      patch: {
        tags: ['Users'],
        summary: 'Modifier rôle / statut / mot de passe (admin)',
        requestBody: json({
          type: 'object',
          properties: { fullName: { type: 'string' }, role: { type: 'string', enum: ['admin', 'staff'] }, isActive: { type: 'boolean' }, password: { type: 'string' } },
        }),
        responses: { 200: { description: 'OK' }, 400: error('Validation'), 403: error('Réservé admin'), 404: error('Introuvable') },
      },
    },
  },
};

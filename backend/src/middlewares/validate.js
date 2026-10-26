// Validates req.params / req.query / req.body against Zod schemas and replaces
// them with the parsed (coerced, defaulted) values. Errors reach errorHandler as ZodError.
const validate = (schemas) => (req, res, next) => {
  try {
    for (const key of ['params', 'query', 'body']) {
      if (schemas[key]) req[key] = schemas[key].parse(req[key] ?? {});
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = validate;

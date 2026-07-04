const ApiError = require('../utils/ApiError');

/**
 * Validates a request segment (body/params/query) against a zod schema.
 * On success the parsed (sanitized, coerced) value replaces the original,
 * so downstream code only ever sees clean data.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;

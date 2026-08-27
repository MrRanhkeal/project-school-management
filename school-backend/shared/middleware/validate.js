'use strict';

const { ApiError } = require('../utils');

/**
 * Validate req[source] against a Zod schema. On success the parsed (and
 * coerced) value replaces the original so downstream handlers get clean data.
 *
 * Express 5 note: `req.query` is a getter-only property on the request
 * prototype that re-parses the query string on every access, so it can
 * neither be reassigned (TypeError) nor mutated in place — assigning would
 * silently leave handlers reading raw strings (`limit: '20'`), which Sequelize
 * then escapes into `LIMIT 0, '20'` and MySQL rejects with a syntax error
 * (surfacing as a 500 "Internal server error" on every list endpoint).
 * Defining an own property on the request instance shadows that prototype
 * getter, so `req.query` returns the coerced object for the rest of the
 * request. `req.validatedQuery` is also published for handlers that read it.
 */
module.exports = function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }

    if (source === 'query') {
      req.validatedQuery = result.data;
      try {
        Object.defineProperty(req, 'query', {
          value: result.data,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } catch {
        // Non-configurable in some Express versions: handlers fall back to
        // req.validatedQuery.
      }
    } else {
      req[source] = result.data;
    }

    return next();
  };
};

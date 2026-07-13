'use strict';

const { ApiError } = require('../utils');

//Validate req[source] against a Zod schema. On success the parsed (and coerced) value replaces the original so downstream handlers get clean data
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
    req[source] = result.data;
    return next();
  };
};

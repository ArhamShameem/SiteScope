const { validationResult } = require('express-validator');

function validateRequest(req, _res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.errors = result.array().map((item) => ({
    field: item.path,
    message: item.msg,
  }));

  return next(error);
}

module.exports = validateRequest;

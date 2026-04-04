function notFound(req, res, _next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || res.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode >= 400 ? statusCode : 500).json({
    message,
    errors: error.errors,
  });
}

module.exports = {
  notFound,
  errorHandler,
};

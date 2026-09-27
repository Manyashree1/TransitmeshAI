export const notFound = (req, res) =>
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

export const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || (err.name === 'JsonWebTokenError' ? 401 : 500);
  const code = err.code || (status === 401 ? 'AUTH_REQUIRED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status >= 500 ? 'SERVER_ERROR' : 'VALIDATION_ERROR');

  if (!err.isOperational || status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message: err.isOperational
        ? err.message
        : err.name === 'JsonWebTokenError'
          ? 'Invalid token'
          : 'Internal server error',
    },
    message: err.isOperational
      ? err.message
      : err.name === 'JsonWebTokenError'
        ? 'Invalid token'
        : 'Internal server error',
  });
};

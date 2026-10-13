/**
 * Global error-handling middleware for Express.
 * Must be registered LAST in the middleware chain (after all routes).
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'An unexpected error occurred.';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const fields = Object.values(err.errors).map((e) => e.message);
    message = fields.join('. ');
  }

  // Mongoose duplicate key (e.g., unique email)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `An account with this ${field} already exists.`;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field: ${err.path}.`;
  }

  // Database & TLS connection errors (e.g. Atlas IP whitelist drops, network timeouts)
  const isDbConnectionError =
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoTimeoutError' ||
    (typeof err.message === 'string' && (
      err.message.includes('SSL routines') ||
      err.message.includes('tlsv1 alert') ||
      err.message.includes('rec_layer_s3') ||
      err.message.includes('SSL alert') ||
      err.message.includes('ECONNREFUSED')
    ));

  if (isDbConnectionError) {
    statusCode = 503;
    message = 'Database service is temporarily unavailable. Please try again in a few moments.';
    console.error(`[Database Error] ${err.name || 'ConnectionError'}: ${err.message?.split('\n')[0]}`);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please sign in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please sign in again.';
  }

  // Email delivery errors
  if (err.code === 'EMAIL_SEND_FAILED' || err.code === 'EMAIL_NOT_CONFIGURED') {
    statusCode = err.status || 502;
    message = err.message || 'Verification email could not be delivered. Please try again.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && !isDbConnectionError && { stack: err.stack }),
  });
};

/**
 * 404 handler — for routes that don't exist.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };

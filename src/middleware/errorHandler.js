export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  let status = typeof err.status === 'number' ? err.status : err.statusCode;
  if (typeof status !== 'number' || status < 400) {
    status = 500;
  }
  const message = err.message || 'Internal server error';
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ message, ...(err.details && { details: err.details }) });
}

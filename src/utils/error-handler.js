/**
 * Custom application-wide error wrapper for structured HTTP and business logic errors.
 */
export class AppError extends Error {
  /**
   * @param {number} statusCode - HTTP status code.
   * @param {string} message - Descriptive error message.
   * @param {Object} [errors=null] - Validation error details by field.
   * @param {string} [errorCode='INTERNAL_ERROR'] - Banking business error code.
   */
  constructor(statusCode, message, errors = null, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errorCode = 'BAD_REQUEST') {
    return new AppError(400, message, null, errorCode);
  }

  static validation(message, errors, errorCode = 'VALIDATION_ERROR') {
    return new AppError(422, message, errors, errorCode);
  }

  static unauthorized(message = 'Unauthorized access', errorCode = 'UNAUTHORIZED') {
    return new AppError(401, message, null, errorCode);
  }

  static forbidden(message = 'Access forbidden', errorCode = 'FORBIDDEN') {
    return new AppError(403, message, null, errorCode);
  }

  static notFound(message = 'Requested resource not found', errorCode = 'NOT_FOUND') {
    return new AppError(404, message, null, errorCode);
  }

  static conflict(message = 'Resource state conflict', errorCode = 'CONFLICT') {
    return new AppError(409, message, null, errorCode);
  }

  static internal(message = 'Internal server exception', errorCode = 'INTERNAL_ERROR') {
    return new AppError(500, message, null, errorCode);
  }
}

/**
 * Standard formatter for route handler responses.
 *
 * @param {Error|AppError} err
 * @returns {{ success: false, error: { message: string, code: string, details: Object|null } }}
 */
export function formatError(err) {
  if (err instanceof AppError) {
    return {
      success: false,
      error: {
        message: err.message,
        code: err.errorCode,
        details: err.errors,
      },
    };
  }

  // Fallback for standard system/database exceptions
  const isDev = process.env.NODE_ENV === 'development';
  return {
    success: false,
    error: {
      message: isDev ? err.message : 'An unexpected banking server error occurred.',
      code: 'INTERNAL_SERVER_ERROR',
      details: isDev ? err.stack : null,
    },
  };
}

export default AppError;

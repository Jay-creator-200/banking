import { NextResponse } from 'next/server';
import { formatError } from './error-handler.js';

/**
 * Generates a standardized API Success response.
 *
 * @param {Object} data - Payload to return.
 * @param {number} [statusCode=200] - HTTP status code.
 * @param {Object} [meta={}] - Pagination or other metadata.
 * @returns {import('next/server').NextResponse}
 */
export function successResponse(data, statusCode = 200, meta = {}) {
  const payload = {
    success: true,
    data,
  };

  if (Object.keys(meta).length > 0) {
    payload.meta = meta;
  }

  return NextResponse.json(payload, { status: statusCode });
}

/**
 * Generates a standardized API Error response.
 *
 * @param {Error|import('./error-handler').AppError} error - Caught exception.
 * @param {number} [fallbackStatusCode=500] - Fallback HTTP code.
 * @returns {import('next/server').NextResponse}
 */
export function errorResponse(error, fallbackStatusCode = 500) {
  const formatted = formatError(error);
  const status = error.statusCode || fallbackStatusCode;

  return NextResponse.json(formatted, { status });
}

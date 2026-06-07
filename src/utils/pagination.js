/**
 * Extract and normalize pagination parameters from request URL.
 *
 * @param {string|URL} requestUrl - Incoming request URL.
 * @param {number} [defaultLimit=10] - Default limit if none provided.
 * @returns {{ page: number, limit: number }}
 */
export function getPaginationParams(requestUrl, defaultLimit = 10) {
  try {
    const url = typeof requestUrl === 'string' ? new URL(requestUrl) : requestUrl;
    const pageVal = url.searchParams.get('page');
    const limitVal = url.searchParams.get('limit');

    const page = Math.max(1, parseInt(pageVal || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(limitVal || String(defaultLimit), 10))); // Cap maximum limit at 100

    return { page, limit };
  } catch (error) {
    return { page: 1, limit: defaultLimit };
  }
}

/**
 * Generates pagination metadata for collection responses.
 *
 * @param {number} total - Total records in collection.
 * @param {number} page - Current requested page.
 * @param {number} limit - Requested page size.
 * @returns {{ total: number, page: number, limit: number, pages: number, hasNextPage: boolean, hasPrevPage: boolean }}
 */
export function formatPaginationMeta(total, page, limit) {
  const pages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    pages,
    hasNextPage: page < pages,
    hasPrevPage: page > 1,
  };
}

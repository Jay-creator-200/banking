/**
 * Utility functions for date manipulation, formatting, and financial year bounds.
 * Specifically configured for Indian Cooperative Banking standard procedures.
 */

/**
 * Format a date object or string into standard formats.
 *
 * @param {Date|string|number} date - The date to format.
 * @param {string} [formatStr='DD-MM-YYYY'] - Output template. Supports DD, MM, YYYY, HH, mm, ss.
 * @returns {string} Formatted output or empty string.
 */
export function formatDate(date, formatStr = 'DD-MM-YYYY') {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return formatStr
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', String(year))
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Calculate the financial year (FY) bounds for a date (April 1st to March 31st).
 *
 * @param {Date|string|number} [date=new Date()]
 * @returns {{ start: Date, end: Date, label: string }}
 */
export function getFinancialYear(date = new Date()) {
  const d = new Date(date);
  const currentMonth = d.getMonth(); // 0 is Jan, 3 is Apr
  const currentYear = d.getFullYear();

  let startYear, endYear;
  if (currentMonth >= 3) {
    startYear = currentYear;
    endYear = currentYear + 1;
  } else {
    startYear = currentYear - 1;
    endYear = currentYear;
  }

  const start = new Date(startYear, 3, 1, 0, 0, 0, 0); // April 1st
  const end = new Date(endYear, 2, 31, 23, 59, 59, 999); // March 31st

  return {
    start,
    end,
    label: `FY ${startYear}-${String(endYear).slice(-2)}`,
  };
}

/**
 * Get count of full calendar days between two dates.
 * Used for interest calculations (e.g., Simple Interest, Daily Balance Accrual).
 *
 * @param {Date|string|number} startDate
 * @param {Date|string|number} endDate
 * @returns {number} Count of days.
 */
export function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Strip time details
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

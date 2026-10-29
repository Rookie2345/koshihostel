/**
 * Nepali Calendar Helper
 * Maps Gregorian month numbers (1-12) to approximate Bikram Sambat (BS) Nepali months.
 */

const GREGORIAN_TO_NEPALI_MONTHS = {
  1: 'Magh',
  2: 'Falgun',
  3: 'Chaitra',
  4: 'Baisakh',
  5: 'Jestha',
  6: 'Ashadh',
  7: 'Shrawan',
  8: 'Bhadra',
  9: 'Ashwin',
  10: 'Kartik',
  11: 'Mangsir',
  12: 'Poush'
};

const NEPALI_MONTH_NAMES = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra'
];

/**
 * Calculate the Bikram Sambat year based on Gregorian year and month.
 * BS year begins in mid-April (month >= 4), when BS year = AD year + 57.
 * For January through mid-April (month 1-3), BS year = AD year + 56.
 * Example: 2026 month 10 (October / Kartik) -> 2026 + 57 = 2083 B.S.
 *
 * @param {number} year - Gregorian year (e.g., 2026)
 * @param {number} month - Gregorian month (1-12)
 * @returns {number} BS Year
 */
function getNepaliYear(year, month) {
  const m = Number(month);
  const y = Number(year);
  return m >= 4 ? y + 57 : y + 56;
}

/**
 * Get the Nepali month name for a Gregorian month.
 *
 * @param {number} month - Gregorian month (1-12)
 * @returns {string} Nepali month name
 */
function getNepaliMonthName(month) {
  const m = Number(month);
  return GREGORIAN_TO_NEPALI_MONTHS[m] || 'Unknown';
}

/**
 * Get formatted Nepali month and year string, e.g. "Baisakh 2083".
 *
 * @param {number} year - Gregorian year
 * @param {number} month - Gregorian month (1-12)
 * @returns {string} Formatted string "Month Year"
 */
function getNepaliMonth(year, month) {
  const monthName = getNepaliMonthName(month);
  const bsYear = getNepaliYear(year, month);
  return `${monthName} ${bsYear}`;
}

module.exports = {
  GREGORIAN_TO_NEPALI_MONTHS,
  NEPALI_MONTH_NAMES,
  getNepaliYear,
  getNepaliMonthName,
  getNepaliMonth
};

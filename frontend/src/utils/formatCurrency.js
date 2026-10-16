/**
 * Formats a numeric value into Nepalese Rupee (NPR) currency using the Indian numbering system (Lakh/Crore).
 * Example: 100000 -> "NPR 1,00,000"
 */
export function formatNPR(amount) {
  if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
    return 'NPR 0';
  }
  const num = parseFloat(amount);
  return 'NPR ' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Returns raw formatted number in en-IN without currency prefix.
 * Example: 100000 -> "1,00,000"
 */
export function formatNumberIN(amount) {
  if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
    return '0';
  }
  const num = parseFloat(amount);
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

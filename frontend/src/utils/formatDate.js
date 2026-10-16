import { format, parseISO, isValid } from 'date-fns';

/**
 * Formats a date string or Date object into a readable date string.
 * Example: "2024-04-15" -> "15 Apr 2024"
 */
export function formatDate(dateInput, formatStr = 'dd MMM yyyy') {
  if (!dateInput) return '-';

  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput);
    if (!isValid(date)) return '-';
    return format(date, formatStr);
  } catch {
    return '-';
  }
}

/**
 * Formats date and time.
 * Example: "2024-04-15T10:30:00" -> "15 Apr 2024, 10:30 AM"
 */
export function formatDateTime(dateInput) {
  return formatDate(dateInput, 'dd MMM yyyy, hh:mm a');
}

/**
 * Returns YYYY-MM-DD for form date inputs.
 */
export function formatInputDate(dateInput) {
  if (!dateInput) return '';
  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput);
    if (!isValid(date)) return '';
    return format(date, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

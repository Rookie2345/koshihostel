import NepaliDate from 'nepali-date-converter';

/**
 * Formats a date string or Date object into a readable Nepali Bikram Sambat (B.S.) date string.
 * Uses exact astronomical BS month calendar (29-32 days per month).
 * Example: "2026-10-29" -> "12 Kartik 2083 B.S."
 */
export function formatDate(dateInput, formatStr = 'DD MMMM YYYY') {
  if (!dateInput) return '-';

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (!date || isNaN(date.getTime())) return '-';
    const bs = new NepaliDate(date);
    return `${bs.format(formatStr)} B.S.`;
  } catch {
    return '-';
  }
}

/**
 * Formats date and time into Nepali B.S. date + AM/PM time.
 * Example: "2026-10-29T10:30:00" -> "12 Kartik 2083 B.S., 10:30 AM"
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (!d || isNaN(d.getTime())) return '-';
    const bs = new NepaliDate(d);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${bs.format('DD MMMM YYYY')} B.S., ${hours}:${minutes} ${ampm}`;
  } catch {
    return '-';
  }
}

/**
 * Returns YYYY-MM-DD for HTML form date inputs (<input type="date" />).
 */
export function formatInputDate(dateInput) {
  if (!dateInput) return '';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (!date || isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export const NEPALI_MONTHS = [
  { id: 1, name: 'Baisakh', nepaliName: 'बैशाख', engApprox: 'Apr - May' },
  { id: 2, name: 'Jestha', nepaliName: 'जेठ', engApprox: 'May - Jun' },
  { id: 3, name: 'Ashadh', nepaliName: 'असार', engApprox: 'Jun - Jul' },
  { id: 4, name: 'Shrawan', nepaliName: 'साउन', engApprox: 'Jul - Aug' },
  { id: 5, name: 'Bhadra', nepaliName: 'भदौ', engApprox: 'Aug - Sep' },
  { id: 6, name: 'Ashwin', nepaliName: 'असोज', engApprox: 'Sep - Oct' },
  { id: 7, name: 'Kartik', nepaliName: 'कार्तिक', engApprox: 'Oct - Nov' },
  { id: 8, name: 'Mangsir', nepaliName: 'मंसिर', engApprox: 'Nov - Dec' },
  { id: 9, name: 'Poush', nepaliName: 'पुष', engApprox: 'Dec - Jan' },
  { id: 10, name: 'Magh', nepaliName: 'माघ', engApprox: 'Jan - Feb' },
  { id: 11, name: 'Falgun', nepaliName: 'फागुन', engApprox: 'Feb - Mar' },
  { id: 12, name: 'Chaitra', nepaliName: 'चैत', engApprox: 'Mar - Apr' },
];

export const GREGORIAN_MONTHS = [
  { id: 1, name: 'January' },
  { id: 2, name: 'February' },
  { id: 3, name: 'March' },
  { id: 4, name: 'April' },
  { id: 5, name: 'May' },
  { id: 6, name: 'June' },
  { id: 7, name: 'July' },
  { id: 8, name: 'August' },
  { id: 9, name: 'September' },
  { id: 10, name: 'October' },
  { id: 11, name: 'November' },
  { id: 12, name: 'December' },
];

// Gregorian Month (1-12) to Approximate Nepali Month
export const GREGORIAN_TO_NEPALI_MAP = {
  1: { id: 10, name: 'Magh', nepaliName: 'माघ' },
  2: { id: 11, name: 'Falgun', nepaliName: 'फागुन' },
  3: { id: 12, name: 'Chaitra', nepaliName: 'चैत' },
  4: { id: 1, name: 'Baisakh', nepaliName: 'बैशाख' },
  5: { id: 2, name: 'Jestha', nepaliName: 'जेठ' },
  6: { id: 3, name: 'Ashadh', nepaliName: 'असार' },
  7: { id: 4, name: 'Shrawan', nepaliName: 'साउन' },
  8: { id: 5, name: 'Bhadra', nepaliName: 'भदौ' },
  9: { id: 6, name: 'Ashwin', nepaliName: 'असोज' },
  10: { id: 7, name: 'Kartik', nepaliName: 'कार्तिक' },
  11: { id: 8, name: 'Mangsir', nepaliName: 'मंसिर' },
  12: { id: 9, name: 'Poush', nepaliName: 'पुष' }
};

export function getApproxNepaliMonth(gregorianMonth) {
  const m = parseInt(gregorianMonth, 10);
  return GREGORIAN_TO_NEPALI_MAP[m] || { id: m, name: '', nepaliName: '' };
}

export function getNepaliMonthName(monthIndex) {
  const num = parseInt(monthIndex, 10);
  const found = NEPALI_MONTHS.find((m) => m.id === num);
  return found ? found.name : `Month ${monthIndex}`;
}

export function getMonthName(monthIndex, system = 'nepali') {
  if (system === 'nepali') return getNepaliMonthName(monthIndex);
  const num = parseInt(monthIndex, 10);
  const found = GREGORIAN_MONTHS.find((m) => m.id === num);
  return found ? found.name : `Month ${monthIndex}`;
}

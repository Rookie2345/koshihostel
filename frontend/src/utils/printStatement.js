/**
 * Initiates the browser print dialog with custom page title support
 * for printing invoices, receipts, and student statements.
 */
export function printStatement(title = 'Koshi Hostel - Statement') {
  const originalTitle = document.title;
  if (title) {
    document.title = title;
  }

  // Small delay to ensure any open UI updates have completed
  setTimeout(() => {
    window.print();
    if (title) {
      document.title = originalTitle;
    }
  }, 150);
}

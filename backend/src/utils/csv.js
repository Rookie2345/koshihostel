/**
 * CSV Generation Utility
 */

function escapeCsvField(val) {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val);
  // If field contains quotes, commas, or newlines, wrap in quotes and escape quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function convertToCsv(data, fields) {
  if (!Array.isArray(data) || data.length === 0) {
    return fields.map((f) => escapeCsvField(f.label || f.value || f)).join(',') + '\n';
  }

  // Header row
  const headers = fields.map((f) => escapeCsvField(f.label || f.value || f)).join(',');

  // Data rows
  const rows = data.map((item) => {
    return fields
      .map((f) => {
        const key = typeof f === 'string' ? f : f.value;
        const val = item[key];
        return escapeCsvField(val);
      })
      .join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Format and send CSV response
 */
function sendCsvResponse(res, filename, csvData) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csvData);
}

module.exports = {
  convertToCsv,
  sendCsvResponse
};

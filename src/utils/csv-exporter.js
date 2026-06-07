/**
 * Export raw javascript object arrays to a CSV file and download in browser.
 * 
 * @param {Array<Object>} data - Raw rows to convert.
 * @param {Array<{ header: string, accessor?: string, cellValue?: function(Object): string }>} columns - Columns config.
 * @param {string} [filename='banking-export.csv']
 */
export function exportToCSV(data, columns, filename = 'banking-export.csv') {
  if (!data || data.length === 0) {
    console.warn('No records available for CSV export.');
    return;
  }

  // Create Header Row
  const headers = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(',');

  // Create Data Rows
  const rows = data.map(row => {
    return columns.map(col => {
      let val = '';
      if (col.cellValue) {
        val = col.cellValue(row);
      } else if (col.accessor) {
        val = row[col.accessor];
      }
      
      const stringified = val !== undefined && val !== null ? String(val) : '';
      return `"${stringified.replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n'); // Injects BOM for Excel UTF-8 compliance
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default exportToCSV;

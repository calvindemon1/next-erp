import * as XLSX from 'xlsx';

/**
 * Helper untuk mengekspor array of objects ke file .xlsx
 * @param {Array<Object>} data - Data yang akan diekspor, misal [{ KolomA: 'Nilai1', KolomB: 123 }]
 * @param {string} fileName - Nama file yang akan didownload
 */
export  function exportToExcel(data, fileName) {
  // Worksheet dari data JSON
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Create workbook baru
  const wb = XLSX.utils.book_new();

  // Tambahkan worksheet ke workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan');

  // Tulis file dan download
  XLSX.writeFile(wb, fileName);
}
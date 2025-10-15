import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { processSummaryData } from '../process/summaryProcessor';

// Fungsi untuk membangun grup data untuk sheet Excel
const buildExcelGroup = (worksheetData, title, groupData, isSales, columnConfig) => {
  if (groupData.length === 0) return;
  
  worksheetData.push([title]);
  worksheetData.push(columnConfig.map(c => c.header));
  
  let groupTotal = { meter: 0, yard: 0, kg: 0, amount: 0 };
  let currentNo = 0;
  
  groupData.forEach(sj => {
    const { mainData, items } = sj;
    if (items.length === 0) return;
    currentNo++;

    items.forEach((item, itemIndex) => {
      groupTotal.meter += item.meter;
      groupTotal.yard += item.yard;
      groupTotal.kg += item.kg;
      groupTotal.amount += item.subtotal;
      
      let dataRow = [];
      if (itemIndex === 0) {
        dataRow.push(currentNo, mainData.customer_name);
        if (!isSales) dataRow.push(mainData.supplier_name);
      } else {
        dataRow.push('', '');
        if (!isSales) dataRow.push('');
      }
      
      dataRow.push(item.corak, item.meter, item.yard, item.kg, item.harga_satuan, item.subtotal);
      worksheetData.push(dataRow);
    });
  });

  // ==== BAGIAN KRITIS: Logika pembuatan baris total yang lebih aman ====
  const totalRow = new Array(columnConfig.length).fill('');
  const labelIndex = isSales ? 2 : 3; // Posisi kolom 'Corak Kain'
  totalRow[labelIndex] = 'Grand Total';
  totalRow[labelIndex + 1] = groupTotal.meter;
  totalRow[labelIndex + 2] = groupTotal.yard;
  totalRow[labelIndex + 3] = groupTotal.kg;
  totalRow[labelIndex + 5] = groupTotal.amount; // Loncat 1 kolom untuk 'Harga'

  worksheetData.push(totalRow);
  worksheetData.push([]);
};

// Fungsi utama yang dipanggil dari Dashboard
export async function exportSummaryToExcel({ kind, data, filterLabel, token }) {
  const isSales = kind === 'sales';
  const title = `Summary ${isSales ? 'Penjualan' : 'Jual Beli'}`;
  
  if (!data || data.length === 0) {
    return Swal.fire("Info", "Tidak ada data untuk diekspor.", "info");
  }
  
  const processedData = await processSummaryData({ kind, data, token });

  if (processedData.invoiced.length === 0 && processedData.pending.length === 0) {
    return Swal.fire("Info", "Tidak ada data detail yang dapat diolah untuk ekspor.", "info");
  }

  const columnConfig = [
    { header: 'No', width: 5 },
    { header: 'Nama Customer', width: 25 },
  ];
  if (!isSales) columnConfig.push({ header: 'Supplier', width: 25 });
  columnConfig.push(
    { header: 'Corak Kain', width: 20 },
    { header: 'Meter', width: 15, format: '#,##0.00' },
    { header: 'Yard', width: 15, format: '#,##0.00' },
    { header: 'Kilogram', width: 15, format: '#,##0.00' },
    { header: 'Harga', width: 18, format: 'Rp #,##0.00' },
    { header: 'Total', width: 20, format: 'Rp #,##0.00' }
  );

  let worksheetData = [[title], [`Periode: ${filterLabel}`], []];
  buildExcelGroup(worksheetData, 'Sudah Terbit Invoice', processedData.invoiced, isSales, columnConfig);
  buildExcelGroup(worksheetData, 'Belum Terbit Invoice', processedData.pending, isSales, columnConfig);

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  ws['!cols'] = columnConfig.map(c => ({ wch: c.width }));
  
  // Terapkan format angka
  let rowIndex = 0;
  worksheetData.forEach(rowData => {
    if (Array.isArray(rowData) && rowData.length > 0) { // Cek jika ini baris data
      rowData.forEach((cellData, colIndex) => {
        const config = columnConfig[colIndex];
        if (config && config.format && typeof cellData === 'number' && cellData > 0) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
          if (ws[cellAddress]) {
            ws[cellAddress].t = 'n';
            ws[cellAddress].z = config.format;
          }
        }
      });
    }
    rowIndex++;
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Summary');
  XLSX.writeFile(wb, `${title} - ${filterLabel}.xlsx`);
}
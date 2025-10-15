import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { processPOStatusData } from '../../helpers/process/poStatusProcessor';

// Helper ini khusus untuk Excel agar menghasilkan angka, bukan string
const formatNumExcel = (n) => parseFloat((+n || 0).toFixed(2));

export async function exportPOStatusToExcel({ block, status, filterLabel, token, poRows, isGreige, PO_DETAIL_FETCHER }) {
  const title = `Rekap ${block.label} - ${status === 'done' ? 'Selesai' : 'Belum Selesai'}`;
  const isSales = block.mode === 'penjualan';
  const isKainJadi = block.key === 'kain_jadi';
  
  const processedData = await processPOStatusData({ poRows, status, block, token, PO_DETAIL_FETCHER });

  if (processedData.length === 0) {
    Swal.fire("Info", `Tidak ada data untuk diekspor dengan status "${status === 'done' ? 'Selesai' : 'Belum Selesai'}".`, "info");
    return;
  }

  const columnConfig = [
    { header: 'No', width: 5 },
    { header: isSales ? "No. SO" : (block.key === 'jual_beli' ? 'No. JB' : "No. PO"), width: 22 },
    { header: `Nama ${isSales ? "Customer" : "Supplier"}`, width: 25 },
    { header: 'Tanggal', width: 12 },
    { header: 'Corak Kain', width: 20 },
  ];
  if (!isGreige) {
    columnConfig.push({ header: 'Warna', width: 18 }, { header: 'Ket. Warna', width: 20 });
  }
  columnConfig.push(
    { header: 'QTY PO', width: 15 },
    { header: 'QTY Masuk', width: 15 },
    { header: 'Sisa PO', width: 15 }
  );
  if (isKainJadi) {
    columnConfig.push(
      { header: 'Harga Greige', width: 18, format: 'Rp #,##0.00' },
      { header: 'Harga Maklun', width: 18, format: 'Rp #,##0.00' }
    );
  } else {
    columnConfig.push({ header: 'Harga', width: 18, format: 'Rp #,##0.00' });
  }
  columnConfig.push({ header: 'Total', width: 20, format: 'Rp #,##0.00' });
  
  const headers = columnConfig.map(c => c.header);
  let worksheetData = [ [title], [`Periode: ${filterLabel}`], [], headers ];
  let grandTotal = 0;

  processedData.forEach((po, index) => {
    const { mainData, items } = po;
    if (items.length === 0) return;

    items.forEach((item, itemIndex) => {
        grandTotal += item.subtotal;

        // Data utama PO hanya diisi pada baris item pertama
        const mainInfo = itemIndex === 0
            ? [ index + 1, mainData.ref, mainData.relasi, mainData.tanggal.split(' ')[0] ]
            : ['', '', '', ''];
        
        let dataRow = [...mainInfo, item.corak];

        if (!isGreige) {
            dataRow.push(item.warna, item.ketWarna);
        }

        // Kuantitas PO juga hanya diisi pada baris pertama
        if (itemIndex === 0) {
            dataRow.push(
                `${formatNumExcel(mainData.totalPO)} ${mainData.unit}`,
                `${formatNumExcel(mainData.masukPO)} ${mainData.unit}`,
                `${formatNumExcel(mainData.sisaPO)} ${mainData.unit}`
            );
        } else {
            // Kolom kuantitas PO dikosongkan untuk item selanjutnya
            dataRow.push('', '', '');
        }

        if (isKainJadi) {
            dataRow.push(item.harga_greige, item.harga_maklun);
        } else {
            dataRow.push(item.harga_satuan);
        }
        dataRow.push(item.subtotal);
        worksheetData.push(dataRow);
    });
  });
  
  const totalRow = new Array(headers.length).fill('');
  totalRow[headers.length - 2] = 'TOTAL AKHIR';
  totalRow[headers.length - 1] = grandTotal;
  worksheetData.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  
  ws['!cols'] = columnConfig.map(c => ({ wch: c.width }));
  worksheetData.forEach((rowData, r) => {
    if (r < 3) return;
    rowData.forEach((cellData, c) => {
      const config = columnConfig[c];
      if (config && config.format && typeof cellData === 'number') {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellAddress]) ws[cellAddress] = {};
        ws[cellAddress].t = 'n';
        ws[cellAddress].z = config.format;
      }
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan PO Status');
  XLSX.writeFile(wb, `${title} - ${filterLabel}.xlsx`);
}
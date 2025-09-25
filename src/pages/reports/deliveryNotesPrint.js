// src/pages/reports/deliveryNotesPrint.js
import {
  getBGDeliveryNotes,
  getOCDeliveryNotes,
  getKJDeliveryNotes,
  getJBDeliveryNotes,
  getSalesOrders,
} from "../../utils/auth"; // sesuaikan kalau path berbeda

// ====== PUBLIC API (panggil ini dari Dashboard) ======
export async function printDeliveryNotes(block, { token, startDate = "", endDate = "" } = {}) {
  // helper yg sama seperti di Dashboard awal
  const formatTanggalIndo = (tanggalString) => {
    const tanggal = new Date(tanggalString);
    const bulanIndo = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const tanggalNum = tanggal.getDate();
    const bulan = bulanIndo[tanggal.getMonth()];
    const tahun = tanggal.getFullYear();
    return `${tanggalNum} ${bulan} ${tahun}`;
  };

  const normalizeDate = (d) => {
    if (!d) return null;
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return null;
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  };

  const refLabelFor = (mode, blockKey) => {
    if (mode === "penjualan") return "No SO";
    if (blockKey === "jual_beli") return "No PC";
    return "No PO";
  };
  const refValueFor = (row, mode, blockKey) => {
    if (mode === "penjualan") return row.no_so ?? "-";
    if (blockKey === "jual_beli") return row.no_jb ?? row.no_pc ?? "-";
    return row.no_po ?? row.no_pc ?? "-";
  };
  const uniqueJoin = (arr, sep = ", ") => {
    const s = Array.from(new Set(arr.filter(Boolean)));
    return s.length ? s.join(sep) : "";
  };
  const fmt2 = (val) => {
    if (val === undefined || val === null || val === "") return "-";
    const n = Number(String(val).replace(/,/g, ""));
    if (!Number.isFinite(n)) return "-";
    return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };
  const pick = (...vals) => vals.find(v => v !== undefined && v !== null && v !== "");

  const rowsFromResponse = (res) =>
    res?.suratJalans ?? res?.surat_jalan_list ?? res?.data ?? [];

  const currentFilterLabel = () => {
    if (!startDate && !endDate) return "Semua Data";
    return `${startDate} s/d ${endDate}`;
  };

  const filterByDate = (rows) => {
    const s = normalizeDate(startDate);
    const e = normalizeDate(endDate);
    if (!s && !e) return rows;
    return rows.filter((r) => {
      const d = normalizeDate(r.created_at);
      if (d === null) return false;
      if (s && d < s) return false;
      if (e && d > e) return false;
      return true;
    });
  };

  const getDetailFetcher = (blockKey) => {
    switch (blockKey) {
      case "greige": return getBGDeliveryNotes;
      case "oc": return getOCDeliveryNotes;
      case "kain_jadi": return getKJDeliveryNotes;
      case "jual_beli": return getJBDeliveryNotes;
      default: return null;
    }
  };

  const safeDetailCall = async (fn, id, token) => {
    try { return await fn(id, token); } catch { try { return await fn(token, id); } catch { return null; } }
  };

  const openPrintWindow = (title, rows, mode, showGrade, blockKey) => {
    const sorted = [...rows].sort((a,b) => (normalizeDate(a.created_at) ?? 0) - (normalizeDate(b.created_at) ?? 0));
    const w = window.open("", "", "height=700,width=980");
    const style = `
      <style>
        @page { size: A4; margin: 8mm; }
        @media print { html, body { width: 210mm; } }
        body{ font-family:ui-sans-serif,system-ui,Segoe UI,Helvetica,Arial; margin:0; display:flex; justify-content:center; }
        .paper{ width:100%; max-width:calc(210mm - 8mm); }
        h1{ margin:0 0 8mm 0 }
        table{ border-collapse:collapse; width:100%; table-layout:fixed; margin:0 auto; }
        th,td{ border:1px solid #000; padding:3px 4px; font-size:10px; word-wrap:break-word; }
        th{ background:#DADBDD; text-align:left }
        thead th:nth-child(1){width:3%; text-align:center}
        thead th:nth-child(2){width:9%; text-align:center}
        thead th:nth-child(3){width:13%; text-align:center}
        thead th:nth-child(4){width:14%; text-align:center}
        thead th:nth-child(5){width:15%; text-align:center}
        thead th:nth-child(6){width:9%; text-align:center}
        ${showGrade ? `thead th:nth-child(7){width:6%; text-align:center}` : ""}
        thead th:nth-child(${showGrade ? 8 : 7}){width:15%; text-align:center}
        thead th:nth-child(${showGrade ? 9 : 8}){width:12%; text-align:center}
        thead th:nth-child(${showGrade ? 10 : 9}){width:12%; text-align:center}
        thead th:nth-child(${showGrade ? 11 : 10}){width:12%; text-align:center}
        thead th:nth-child(6), tbody td:nth-child(6){ text-align:center; }
        ${showGrade ? `thead th:nth-child(7), tbody td:nth-child(7){ text-align:center; }` : ``}
        ${showGrade ? `thead th:nth-child(8), tbody td:nth-child(8){ text-align:center; }`
                    : `thead th:nth-child(7), tbody td:nth-child(7){ text-align:center; }`}
        tbody td:nth-child(${showGrade ? 9 : 8}),
        tbody td:nth-child(${showGrade ? 10 : 9}),
        tbody td:nth-child(${showGrade ? 11 : 10}){ text-align:center; }
      </style>`;
    const header = `<h1>${title}</h1>
      <div>Periode: ${currentFilterLabel()}</div>
      <div>Tanggal cetak: ${new Date().toLocaleString()}</div><br/>`;
    const relasiHeader = mode === "penjualan" ? "Customer" : "Supplier";
    const refLabel = refLabelFor(mode, blockKey);
    const thead = `<tr>
        <th>No</th><th>Tgl</th><th>No SJ</th><th>${refLabel}</th><th>${relasiHeader}</th><th>Warna</th>
        ${showGrade ? `<th>Grade</th>` : ``}
        <th>Kain</th><th>Total Meter</th><th>Total Yard</th><th>Total Kg</th></tr>`;
    const tbody = sorted.map((r,i)=>`
      <tr>
        <td>${i+1}</td>
        <td>${formatTanggalIndo(r.created_at ?? "-")}</td>
        <td>${r.no_sj ?? "-"}</td>
        <td>${refValueFor(r, mode, blockKey)}</td>
        <td>${r.supplier_name ?? r.customer_name ?? "-"}</td>
        <td>${r.kode_warna ?? r.warna_kode ?? r.warna ?? "-"}</td>
        ${showGrade ? `<td>${r.grade_name ?? "-"}</td>` : ``}
        <td>${r.corak_kain ?? "-"}</td>
        <td>${fmt2(pick(r.meter_total,  r.summary?.total_meter))}</td>
        <td>${fmt2(pick(r.yard_total,   r.summary?.total_yard))}</td>
        <td>${fmt2(pick(r.total_kilogram, r.summary?.total_kilogram))}</td>
      </tr>`).join("");
    const table = `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
    const bodyHtml = `<div class="paper">${header}${table}</div>`;
    w.document.write(`<html><head><title>${title}</title>${style}</head><body>${bodyHtml}</body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  // ========= LOGIKA UTAMA (SAMA DENGAN DASHBOARD AWAL) =========
  const res = await block.rawFetcher(token);
  const baseRows = filterByDate(rowsFromResponse(res));
  const detailFn = getDetailFetcher(block.key);

  if (detailFn) {
    const MAX_CONC = 5;
    const queue = [...baseRows];
    const enriched = [];
    const worker = async () => {
      const row = queue.shift();
      if (!row) return;
      try {
        const det = await safeDetailCall(detailFn, row.id, token);
        const sj = det?.suratJalan;
        const items = sj?.items ?? [];
        const warna = uniqueJoin(items.map(it => it.kode_warna ?? it.warna_kode ?? it.warna ?? null));
        const kain  = uniqueJoin(items.map(it => it.corak_kain ?? null));
        enriched.push({
          ...row,
          supplier_name: sj?.supplier_name ?? row.supplier_name,
          customer_name: sj?.customer_name ?? row.customer_name,
          no_po: sj?.no_po ?? row.no_po,
          no_pc: sj?.no_pc ?? row.no_pc,
          no_jb: sj?.no_jb ?? row.no_jb,
          kode_warna: warna || row.kode_warna || row.warna_kode || row.warna || "-",
          corak_kain: kain  || row.corak_kain || "-",
        });
      } catch {
        enriched.push(row);
      }
      return worker();
    };
    await Promise.all(Array.from({ length: Math.min(MAX_CONC, queue.length) }, worker));
    openPrintWindow(`Laporan - ${block.label}`, enriched, block.mode, false, block.key);
    return;
  }

  if (block.mode === "penjualan") {
    const MAX_CONC = 5;
    const queue = [...baseRows];
    const enriched = [];
    const worker = async () => {
      const row = queue.shift();
      if (!row) return;
      const soId = row.so_id ?? row.soId ?? null;
      if (!soId) { enriched.push(row); return worker(); }
      try {
        const soRes = await safeDetailCall(getSalesOrders, soId, token);
        const so = soRes?.order;
        const items = so?.items ?? [];
        const warna = uniqueJoin(items.map((it) => it.kode_warna ?? null));
        const grade = uniqueJoin(items.map((it) => it.grade_name ?? null));
        const kain  = uniqueJoin(items.map((it) => it.corak_kain ?? null));
        enriched.push({
          ...row,
          no_so: so?.no_so ?? row.no_so,
          customer_name: so?.customer_name ?? row.customer_name,
          kode_warna: warna || row.kode_warna || "-",
          grade_name: grade || row.grade_name || "-",
          corak_kain: kain || row.corak_kain || "-",
        });
      } catch {
        enriched.push(row);
      }
      return worker();
    };
    await Promise.all(Array.from({ length: Math.min(MAX_CONC, queue.length) }, worker));
    openPrintWindow(`Laporan - ${block.label}`, enriched, block.mode, true, block.key);
    return;
  }

  openPrintWindow(`Laporan - ${block.label}`, baseRows, block.mode, true, block.key);
}

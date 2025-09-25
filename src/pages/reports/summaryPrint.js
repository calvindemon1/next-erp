import {
  getAllDeliveryNotes,     // sales list
  getAllJBDeliveryNotes,   // jb list
  getDeliveryNotes,        // sales detail
  getJBDeliveryNotes,      // jb detail
} from "../../utils/auth";

export async function printSummaryReport({
  kind,            // 'sales' | 'jual_beli'
  token,
  startDate = "",
  endDate = "",
}) {
  const isSales = kind === "sales";

  // ==== helpers ====
  const normalizeDate = (d) => {
    if (!d) return null;
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return null;
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  };
  const formatDateRange = () =>
    (!startDate && !endDate) ? "Semua Data" : `${startDate} s/d ${endDate}`;
  const rowsFromResponse = (res) =>
    res?.suratJalans ?? res?.surat_jalan_list ?? res?.data ?? [];
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
  const uniqJoin = (arr, sep = ", ") =>
    Array.from(new Set(arr.filter(Boolean))).join(sep);
  const fmt2 = (n) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(+n || 0);

  // ==== ambil LIST sesuai jenis ====
  const listRes = isSales
    ? await getAllDeliveryNotes(token)
    : await getAllJBDeliveryNotes(token);
  const baseRows = filterByDate(rowsFromResponse(listRes));

  // ==== enrich dengan detail (ambil corak dari detail, fallback dari list.items) ====
  const MAX = 5;
  const queue = [...baseRows];
  const rows = [];
  const safeDetailCall = async (fn, id, tok) => {
    try { return await fn(id, tok); }
    catch { try { return await fn(tok, id); } catch { return null; } }
  };

  const worker = async () => {
    const row = queue.shift();
    if (!row) return;

    try {
      const det = await safeDetailCall(
        isSales ? getDeliveryNotes : getJBDeliveryNotes,
        row.id,
        token
      );
      const sj = det?.suratJalan || det?.surat_jalan || det?.data || {};
      const items = (sj?.items ?? row?.items ?? []); // fallback ke list.items
      rows.push({
        delivered_status: +row.delivered_status === 1,
        customer_name: sj?.customer_name ?? row?.customer_name ?? "-",
        supplier_name: sj?.supplier_name ?? row?.supplier_name ?? "-",
        corak_kain: uniqJoin(items.map((it) => it?.corak_kain ?? null)) || "-",
        summary: sj?.summary ?? row?.summary ?? {},
      });
    } catch {
      const items = row?.items ?? [];
      rows.push({
        delivered_status: +row.delivered_status === 1,
        customer_name: row?.customer_name ?? "-",
        supplier_name: row?.supplier_name ?? "-",
        corak_kain: uniqJoin(items.map((it) => it?.corak_kain ?? null)) || "-",
        summary: row?.summary ?? {},
      });
    }

    return worker();
  };
  await Promise.all(
    Array.from({ length: Math.min(MAX, queue.length) }, worker)
  );

  // ==== pecah: sudah terbit vs belum ====
  const groups = {
    invoiced: rows.filter((r) => r.delivered_status),
    pending: rows.filter((r) => !r.delivered_status),
  };

  // ==== util qty per baris & total ====
  const qtyCells = (s) => ({
    m: +s?.total_meter || 0,
    y: +s?.total_yard || 0,
    kg: +s?.total_kilogram || 0,
  });
  const totalsByUnit = (arr) =>
    arr.reduce(
      (acc, r) => {
        const q = qtyCells(r.summary);
        acc.meter += q.m;
        acc.yard += q.y;
        acc.kilogram += q.kg;
        return acc;
      },
      { meter: 0, yard: 0, kilogram: 0 }
    );

  // ==== builder table (header 2 baris; Quantity = 3 subkolom) ====
  const buildTable = (label, data) => {
    const totals = totalsByUnit(data);
    const hideSupplier = isSales;

    const th = `
      <tr>
        <th rowspan="2" style="width:4%;text-align:center">No</th>
        <th rowspan="2" style="width:${hideSupplier ? "36%" : "26%"};">Nama Customer</th>
        ${hideSupplier ? "" : `<th rowspan="2" style="width:22%;">Supplier</th>`}
        <th rowspan="2" style="width:30%;">Corak Kain</th>
        <th colspan="3" style="width:24%;text-align:center">Quantity</th>
      </tr>
      <tr>
        <th style="text-align:center;width:8%;">Meter</th>
        <th style="text-align:center;width:8%;">Yard</th>
        <th style="text-align:center;width:8%;">Kilogram</th>
      </tr>`;

    const tb = data
      .map((r, i) => {
        const q = qtyCells(r.summary);
        return `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${r.customer_name}</td>
          ${hideSupplier ? "" : `<td>${r.supplier_name}</td>`}
          <td>${r.corak_kain}</td>
          <td style="text-align:center">${fmt2(q.m)}</td>
          <td style="text-align:center">${fmt2(q.y)}</td>
          <td style="text-align:center">${fmt2(q.kg)}</td>
        </tr>`;
      })
      .join("");

    // Grand Total tepat di bawah Meter | Yard | Kilogram
    const nonQtyColspan = hideSupplier ? 3 : 4; // No + Customer + [Supplier] + Corak
    const foot = `
      <tr>
        <td colspan="${nonQtyColspan}" style="text-align:right;font-weight:bold">Grand Total:</td>
        <td style="text-align:center;font-weight:bold">${fmt2(totals.meter)}</td>
        <td style="text-align:center;font-weight:bold">${fmt2(totals.yard)}</td>
        <td style="text-align:center;font-weight:bold">${fmt2(totals.kilogram)}</td>
      </tr>`;

    const emptyCols = hideSupplier ? 6 : 7; // total kolom body
    return `
      <h3 style="margin:10px 0 6px 0">${label}</h3>
      <table style="border-collapse:collapse;width:100%;table-layout:fixed" border="1" cellspacing="0" cellpadding="3">
        <thead style="background:#DADBDD">${th}</thead>
        <tbody>${
          tb ||
          `<tr><td colspan="${emptyCols}" style="text-align:center">-</td></tr>`
        }</tbody>
        <tfoot>${foot}</tfoot>
      </table>
    `;
  };

  // ==== PRINT ====
  const title = `Summary ${isSales ? "Penjualan" : "Jual Beli"}`;
  const style = `
    <style>
      @page { 
        size: A4; 
        margin: 8mm; 
      }
      @media print { 
        html, body { 
            width: 210mm; 
        } 
      }
      body{ 
        font-family:ui-sans-serif,system-ui,Segoe UI,Helvetica,Arial; 
        margin:0; 
        display:flex; 
        justify-content:center; 
      }
      .paper{ 
        width:100%; 
        max-width:calc(210mm - 8mm); 
      }
      h1{ 
        margin:0 0 6mm 0 
      }
      h3{ 
        font-size:12px; 
      }
      table,th,td{ 
        font-size:10px; 
      }
    </style>
  `;
  const header = `
    <h1>${title}</h1>
    <div>Periode: ${formatDateRange()}</div>
    <div>Tanggal cetak: ${new Date().toLocaleString()}</div><br/>
  `;
  const html = `
    <div class="paper">
      ${header}
      ${buildTable("Sudah Terbit Invoice", groups.invoiced)}
      <br/>
      ${buildTable("Belum Terbit Invoice", groups.pending)}
    </div>
  `;

  const w = window.open("", "", "height=700,width=980");
  w.document.write(
    `<html><head><title>${title}</title>${style}</head><body>${html}</body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
}

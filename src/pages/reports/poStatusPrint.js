export async function printPOStatus({
  blockKey, 
  mode, 
  status, 
  poRows, 
  startDate, 
  endDate, 
  userToken,
  SJ_LIST_FETCHER, 
  SJ_DETAIL_FETCHER, 
  PO_DETAIL_FETCHER,
}) {
  const isGreige = blockKey === "greige";
  const isSales  = mode === "penjualan" || blockKey === "sales";
  const relasiHeader = (isSales || blockKey === "jual_beli") ? "Customer" : "Supplier";

  // ==== helpers qty dari PO
  const unitName = (po) => po?.satuan_unit_name || "Meter";
  const totalsByUnit = (po) => {
    const u = unitName(po);
    const s = po?.summary || {};
    if (u === "Meter")    return { unit: "Meter",    total: +(+s.total_meter || 0),    masuk: +(+s.total_meter_dalam_proses || 0) };
    if (u === "Yard")     return { unit: "Yard",     total: +(+s.total_yard || 0),     masuk: +(+s.total_yard_dalam_proses || 0) };
    if (u === "Kilogram") return { unit: "Kilogram", total: +(+s.total_kilogram || 0), masuk: +(+s.total_kilogram_dalam_proses || 0) };
    return { unit: "Meter", total: 0, masuk: 0 };
  };
  const isDone = (po) => {
    const { total, masuk } = totalsByUnit(po);
    const sisa = total - masuk;
    if (total <= 0) return false;
    return isGreige ? (sisa <= total * 0.1 + 1e-9) : (sisa <= 0 + 1e-9);
  };

  const filteredPOs = poRows.filter(po => (status === "done" ? isDone(po) : !isDone(po)));

  // ==== mapping nomor referensi
  const refKey     = (bk, md) => (bk === "jual_beli" ? "no_jb" : (md === "penjualan" || bk === "sales" ? "no_so" : "no_po"));
  const refHeader  = (bk, md) => (bk === "jual_beli" ? "No JB" : (md === "penjualan" || bk === "sales" ? "No SO" : "No PO"));
  const getRefValue = (row, bk, md) => row[refKey(bk, md)] ?? "-";

  // ==== index Tgl Pengiriman / Tgl SJ terbaru
  const sjListFetcher   = SJ_LIST_FETCHER[blockKey];
  const sjDetailFetcher = SJ_DETAIL_FETCHER[blockKey] || null;
  const normDT = (d) => { if (!d) return null; const x = new Date(d); return Number.isNaN(x.getTime()) ? null : x; };

  // SALES: tanggal SJ = created_at; Non-sales: tanggal pengiriman = tanggal_kirim
  const pickFromList = (row) => isSales ? normDT(row?.created_at ?? null)
                                        : normDT(row?.tanggal_kirim ?? null);
  const pickFromDetail = (sj) => isSales ? normDT(sj?.created_at ?? null)
                                         : normDT(sj?.tanggal_kirim ?? null);

  const sjDateIndex = {}; // refNo => Date
  try {
    if (sjListFetcher) {
      const sjListRes = await sjListFetcher(userToken);
      const baseRows = (sjListRes?.suratJalans ?? sjListRes?.surat_jalan_list ?? sjListRes?.data ?? []);

      // Prefill dari LIST (berfungsi walau tidak ada detail fetcher)
      for (const row of baseRows) {
        const ref = row?.no_jb ?? row?.no_po ?? row?.no_so ?? null;
        const tgl = pickFromList(row);
        if (ref && tgl && (!sjDateIndex[ref] || tgl > sjDateIndex[ref])) sjDateIndex[ref] = tgl;
      }

      // Jika ada detail fetcher, refine pakai detail
      if (sjDetailFetcher) {
        const queue = [...baseRows];
        const MAX = 5;
        const worker = async () => {
          const row = queue.shift(); if (!row) return;
          try {
            const det = await safeDetailCall(sjDetailFetcher, row.id, userToken);
            const sj  = det?.suratJalan || det?.surat_jalan || det?.data || {};
            const ref = sj?.no_jb ?? sj?.no_po ?? sj?.no_so ?? row?.no_jb ?? row?.no_po ?? row?.no_so ?? null;
            const tgl = pickFromDetail(sj);
            if (ref && tgl && (!sjDateIndex[ref] || tgl > sjDateIndex[ref])) sjDateIndex[ref] = tgl;
          } catch {}
          return worker();
        };
        await Promise.all(Array.from({ length: Math.min(MAX, queue.length) }, worker));
      }
    }
  } catch {}

  // ==== detail PO → Corak / Warna / Ket Warna
  const poDetailFetcher = PO_DETAIL_FETCHER[blockKey];
  const collectKetWarna = (items) => {
    const vals = items.map(it => (it?.keterangan_warna ?? ""));
    const nonEmpty = Array.from(new Set(vals.filter(v => String(v).trim() !== "")));
    return nonEmpty.length ? nonEmpty.join(", ") : "";
  };

  const rowsEnriched = [];
  if (poDetailFetcher) {
    const queue = [...filteredPOs];
    const MAX = 5;
    const worker = async () => {
      const po = queue.shift(); if (!po) return;

      let corak = "-", warna = "-", ketWarna = "";
      try {
        const dres  = await safeDetailCall(poDetailFetcher, po.id, userToken);
        const order = dres?.order || dres?.data || {};
        const items = order?.items || [];
        const coraks = uniq(items.map(it => it?.corak_kain ?? null));
        const warnas = uniq(items.map(it => it?.kode_warna ?? it?.warna_kode ?? it?.warna ?? null));
        if (coraks.length) corak = coraks.join(", ");
        if (!isGreige && warnas.length) warna = warnas.join(", ");
        ketWarna = collectKetWarna(items); // bisa "" kalau semua kosong
      } catch {}

      const { unit, total, masuk } = totalsByUnit(po);
      const sisa = Math.max(0, +(total - masuk).toFixed(4));
      const ref  = getRefValue(po, blockKey, mode);
      const pengiriman = sjDateIndex[ref] ? formatDatePrint(sjDateIndex[ref]) : "-";

      rowsEnriched.push({
        po, unit, total, masuk, sisa, pengiriman,
        relasi: (isSales || blockKey === "jual_beli") ? (po?.customer_name ?? po?.customer ?? "-")
                                                      : (po?.supplier_name ?? po?.supplier ?? "-"),
        corak, warna, ketWarna, ref,
      });
      return worker();
    };
    await Promise.all(Array.from({ length: Math.min(MAX, queue.length) }, worker));
  }

  const finalRows = rowsEnriched.length
    ? rowsEnriched
    : filteredPOs.map(po => {
        const { unit, total, masuk } = totalsByUnit(po);
        const sisa = Math.max(0, +(total - masuk).toFixed(4));
        const ref  = getRefValue(po, blockKey, mode);
        const pengiriman = sjDateIndex[ref] ? formatDatePrint(sjDateIndex[ref]) : "-";
        return {
          po, unit, total, masuk, sisa, pengiriman,
          relasi: (isSales || blockKey === "jual_beli") ? (po?.customer_name ?? po?.customer ?? "-")
                                                        : (po?.supplier_name ?? po?.supplier ?? "-"),
          corak: po?.corak_kain ?? "-",
          warna: isGreige ? "-" : (po?.kode_warna ?? "-"),
          ketWarna: "",
          ref,
        };
      });

  // ==== PRINT ====
  const title = `Rekap ${isSales ? "Penjualan" : "Pembelian"} ${mapBlockLabel(blockKey)} - ${status === "done" ? "Selesai" : "Belum Selesai"}`;

  const showWarna    = !isGreige;
  const showKet      = !isGreige;
  const showTanggal  = !isSales; // ⬅️ Sales: Tanggal disembunyikan
  const pengirimanTh = isSales ? "Tgl Surat Jalan" : "Tgl Pengiriman";

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
      table{ 
        border-collapse:collapse; 
        width:100%; 
        table-layout:fixed; 
        margin:0 auto; 
      }
      th,td{ 
        border:1px solid #000; 
        padding:3px 4px; 
        font-size:10px; 
        word-wrap:break-word; 
      }
      th{ 
        background:#DADBDD; 
        text-align:left 
      }
      td.num, th.num { 
        text-align:center; 
      }
    </style>
  `;

  const headerHtml = `
    <h1>${title}</h1>
    <div>Periode: ${(!startDate && !endDate) ? "Semua Data" : `${startDate} s/d ${endDate}`}</div>
    <div>Tanggal cetak: ${new Date().toLocaleString()}</div><br/>
  `;

  // thead dinamis
  const headCells = [
    { label: "No", num: true },
    { label: `Nama ${relasiHeader}` },
    { label: refHeader(blockKey, mode) },
    ...(showTanggal ? [{ label: "Tanggal", num: true }] : []),
    { label: "Corak Kain" },
    ...(showWarna ? [{ label: "Warna", num: true }] : []),
    ...(showKet ? [{ label: "Keterangan Warna" }] : []),
    { label: "QTY PO", num: true },
    { label: "QTY Masuk", num: true },
    { label: "Sisa PO", num: true },
    { label: pengirimanTh, num: true },
  ];
  const thead = `<tr>${headCells.map(h => `<th class="${h.num?'num':''}">${h.label}</th>`).join("")}</tr>`;

  // tbody dinamis
  const tbody = finalRows
    .sort((a,b) => (new Date(a.po.created_at)) - (new Date(b.po.created_at)))
    .map((r, i) => {
      const qtyPO   = `${formatNum(r.total)} ${r.unit}`;
      const qtyIn   = `${formatNum(r.masuk)} ${r.unit}`;
      const qtySisa = `${formatNum(r.sisa)} ${r.unit}`;
      const tglPO   = formatDatePrint(r.po.created_at);

      const cells = [
        { v: i+1, num: true },
        { v: safe(r.relasi) },
        { v: safe(r.ref) },
        ...(showTanggal ? [{ v: tglPO, num: true }] : []),
        { v: safe(r.corak) },
        ...(showWarna ? [{ v: safe(r.warna), num: true }] : []),
        ...(showKet ? [{ v: safe(r.ketWarna) }] : []),
        { v: qtyPO,   num: true },
        { v: qtyIn,   num: true },
        { v: qtySisa, num: true },
        { v: r.pengiriman, num: true },
      ];

      return `<tr>${cells.map(c => `<td class="${c.num?'num':''}">${c.v}</td>`).join("")}</tr>`;
    }).join("");

  const w = window.open("", "", "height=700,width=980");
  w.document.write(`
    <html>
      <head><title>${title}</title>${style}</head>
      <body><div class="paper">
        ${headerHtml}
        <table>
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      </div></body>
    </html>
  `);
  w.document.close(); w.focus(); w.print();
}

/* utils */
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
function safe(s) { return (s == null ? "-" : String(s)); }
function formatNum(n) {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(+n || 0);
}
function formatDatePrint(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "-";
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth()+1).padStart(2, "0");
  const yy = x.getFullYear();
  return `${dd}-${mm}-${yy}`;
}
async function safeDetailCall(fn, id, token) {
  try { return await fn(id, token); } catch { try { return await fn(token, id); } catch { return null; } }
}
function mapBlockLabel(key) {
  if (key === "greige") return "Greige";
  if (key === "oc") return "Order Celup";
  if (key === "kain_jadi") return "Kain Jadi";
  if (key === "jual_beli") return "Jual Beli";
  if (key === "sales") return "Penjualan";
  return "-";
}

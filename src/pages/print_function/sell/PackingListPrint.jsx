import { createMemo, createSignal, For, Show, onMount, createEffect } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import { splitIntoPagesWithOffsets, createStretch } from "../../../components/PrintUtils";

export default function PackingListPrint(props) {
  const [plData, setPlData] = createSignal(props.data ?? null);

  // fallback ke localStorage bila props tidak ada
  onMount(() => {
    if (!plData()) {
      try {
        const raw = localStorage.getItem("printData");
        if (raw) setPlData(JSON.parse(raw));
      } catch (e) {
        console.error("Gagal parse localStorage printData:", e);
      }
    }
  });

  const data = createMemo(() => plData() ?? { itemGroups: [], sales_order_items: {} });

  /* ===== Helpers ===== */
  const isEkspor = createMemo(() => {
    const t = data()?.type;
    const s = (t == null ? "" : String(t)).trim().toUpperCase();
    if (s === "2" || s === "E" || s === "EKSPOR") return true;
    if (s === "1" || s === "D" || s === "DOMESTIK") return false;
    const noSO = data()?.sales_order_items?.no_so || "";
    const kode = (noSO.split("/")[1] || "").toUpperCase();
    return kode === "E";
  });

  const MAX_COL = createMemo(() => (isEkspor() ? 10 : 5));

  const unit = createMemo(() =>
    (data()?.satuan_unit || data()?.sales_order_items?.satuan_unit || "")
      .toString()
      .toLowerCase()
  );
  const ROLL_KEY = createMemo(() => (unit() === "yard" ? "yard" : "meter"));

  const todayStr = createMemo(() =>
    new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
  );
  const createdShort = createMemo(() => {
    const src =
      data()?.sales_order_items?.created_at ||
      data()?.created_at ||
      new Date().toISOString();
    const d = new Date(src.replace(" ", "T"));
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); // 15 Sep 2025
  });

  function fmt2(v) {
    if (v === null || v === undefined || v === "" || Number.isNaN(Number(v))) return "0,00";
    return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v));
  }

  // peta item id -> nama corak
  const itemsMap = createMemo(() =>
    Object.fromEntries((data()?.sales_order_items?.items || []).map((it) => [it.id, it.corak_kain]))
  );

  // peta colorId -> deskripsi warna
  const colorDescMap = createMemo(() =>
    Object.fromEntries(
      (data()?.sales_order_items?.items || []).map((it) => [
        it.warna_id ?? it.color_id ?? it.warna?.id ?? it.col ?? "",
        it.deskripsi_warna ?? it.warna_deskripsi ?? it.warna?.deskripsi ?? it.color_desc ?? "",
      ])
    )
  );

  /* ===== Flatten rows (per MAX_COL) + subtotal per group ===== */
  const flattenedRows = createMemo(() => {
    const rows = [];
    (data()?.itemGroups || []).forEach((g, gi) => {
      const itemName =
        itemsMap()[g.so_item_id] || itemsMap()[g.item] || g.item || "-";
      const colorDesc =
        colorDescMap()[g.col] ||
        colorDescMap()[(g.rolls?.[0]?.col)] ||
        g.col ||
        "";

      const rolls = g.rolls || [];
      const rowCount = Math.ceil(rolls.length / MAX_COL());

      // group totals
      const gPcs = rolls.filter((r) => Number(r?.[ROLL_KEY()]) > 0).length;
      const gMtr = rolls.reduce((s, r) => s + (parseFloat(r.meter) || 0), 0);
      const gYrd = rolls.reduce((s, r) => s + (parseFloat(r.yard) || 0), 0);

      for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
        const start = rowIdx * MAX_COL();
        const rowRolls = rolls.slice(start, start + MAX_COL());

        const first = rowRolls[0] || {};
        const bal = first?.no_bal ?? "";
        const lot = first?.lot ?? "";

        const pcsRow = rowRolls.filter((r) => Number(r?.[ROLL_KEY()]) > 0).length;
        const mRow = rowRolls.reduce((s, r) => s + (parseFloat(r.meter) || 0), 0);
        const yRow = rowRolls.reduce((s, r) => s + (parseFloat(r.yard) || 0), 0);

        rows.push({
          type: "row",
          gi,
          rowIdx,
          isFirst: rowIdx === 0,
          colorDesc,           // Col (deskripsi warna)
          itemName,            // Item (corak)
          lot,
          bal,
          rowRolls,
          pcsRow,
          mRow,
          yRow,
        });
      }

      rows.push({
        type: "subtotal",
        gi,
        gPcs,
        gMtr,
        gYrd,
      });
    });
    return rows;
  });

  /* ===== Grand totals ===== */
  const grandTotals = createMemo(() => {
    let pcs = 0, m = 0, y = 0;
    (data()?.itemGroups || []).forEach((g) => {
      (g.rolls || []).forEach((r) => {
        if (Number(r?.[ROLL_KEY()]) > 0) pcs += 1;
        m += parseFloat(r.meter || 0);
        y += parseFloat(r.yard || 0);
      });
    });
    return { pcs, m, y };
  });

  /* ===== Pagination ===== */
  const ROWS_FIRST_PAGE = 40;
  const ROWS_OTHER_PAGES = 40;
  const pagesWithOffsets = createMemo(() =>
    splitIntoPagesWithOffsets(flattenedRows(), ROWS_FIRST_PAGE, ROWS_OTHER_PAGES)
  );

  return (
    <>
      <style>{`
        :root { 
          --safe: 10mm;
          --logo-size: 16mm;
        }

        @page { size: A4 portrait; margin: 0; }
        html, body {
          margin: 0; 
          padding: 0; 
          height: 100%; 
          width: 100%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: Arial, sans-serif;
          display: flex; 
          justify-content: center;
        }
        .page { 
          width: 210mm; 
          height: 285mm; 
          padding: 0; 
          box-sizing: border-box;
          position: relative; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
        }
        .safe { 
          width: 100%; 
          height: 100%; 
          padding: var(--safe); 
          box-sizing: border-box;
          display: flex; 
          flex-direction: column; 
          gap: 8px; 
        }
        .header-center{
          width:100%;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          text-align:center;
          gap:4px;
          margin: 0 0 4px 0;
        }
        .header-center .title{
          margin: 4px 0 2px 0;
          font-weight:700;
          text-transform:uppercase;
          font-size:18px;
          line-height:1.1;
        }  
        table { 
          border-collapse: collapse; 
          width: 100%; 
          page-break-inside: auto; 
        }
        th, td { 
          border: 1px solid #000; 
          padding: 1px 2px; 
          font-size: 11px; 
        }
        th { 
          text-align: center; 
        }
        .no-border { 
          border: none !important; 
        }
        .table-fixed { 
          table-layout: fixed; 
        }
        td.num { 
          text-align: right; 
          white-space: nowrap; 
        }
        .stretch-row td {
          border: 0 !important;            /* tak ada garis di dalam area kosong */
          /* biar tetap rapi */
          padding: 1px 2px; 
          height: 20px; /* atau pakai h-5 seperti sebelumnya */
        }
        @media print {
          .page { page-break-after: always; }
          .page:last-child { page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>

      <For each={pagesWithOffsets()}>
        {(p, idx) => {
          const pageIndex = idx();
          const count = pagesWithOffsets().length;
          const isLast = pageIndex === count - 1;
          return (
            <PrintPage
              pageNo={pageIndex + 1}
              pageCount={count}
              isLast={isLast}
              data={data()}
              items={p.items}
              todayStr={todayStr()}
              createdShort={createdShort()}
              unitKey={ROLL_KEY()}
              maxCol={MAX_COL()}
              totals={grandTotals()}
              isPPN={Number(data()?.sales_order_items?.ppn_percent) > 0}
            />
          );
        }}
      </For>
    </>
  );
}

/* ===== Halaman ===== */
function PrintPage(props) {
  const { data, items, pageNo, pageCount, isLast, todayStr, createdShort, unitKey, maxCol, totals, isPPN } = props;

  // Auto-stretch row kosong agar footer/halaman rapi
  const { extraRows, bind, recalc } = createStretch({ fudge: 56 });

  // Pastikan recalc terpanggil untuk semua kasus (dengan/ tanpa logo, 5/10 kolom)
  onMount(() => {
    requestAnimationFrame(recalc);
    setTimeout(recalc, 60);
  });
  createEffect(() => { (items?.length ?? 0); isLast; requestAnimationFrame(recalc); });
  createEffect(() => { maxCol; requestAnimationFrame(recalc); });
  createEffect(() => { isPPN ? 1 : 0; requestAnimationFrame(recalc); });

  // ====== COLGROUP dinamis agar tidak kepotong kanan ======
  // Fixed width (persen) untuk kolom non-roll
  const W_NO = 3, W_BAL = 5, W_COL = 8, W_ITEM = 9, W_LOT = 5, W_TTL = 8; // TTL dipakai 3x
  const fixedPct = W_NO + W_BAL + W_COL + W_ITEM + W_LOT + (W_TTL * 3);     // = 53%
  const rollPct = Math.max(0, 100 - fixedPct);
  const eachRollPct = rollPct / maxCol;

  const ColGroup = () => (
    <colgroup>
      <col style={`width:${W_NO}%`} />
      <col style={`width:${W_BAL}%`} />
      <col style={`width:${W_COL}%`} />
      <col style={`width:${W_ITEM}%`} />
      <col style={`width:${W_LOT}%`} />
      <For each={Array.from({ length: maxCol })}>
        {() => <col style={`width:${eachRollPct}%`} />}
      </For>
      <col style={`width:${W_TTL}%`} />
      <col style={`width:${W_TTL}%`} />
      <col style={`width:${W_TTL}%`} />
    </colgroup>
  );
  // ========================================================

  return (
    <div ref={bind("pageRef")} className="page">
      <div className="safe">
        {/* Row measurer: jumlah kolom dinamis */}
        <table style="position:absolute; top:-10000px; left:-10000px; visibility:hidden;">
          <tbody>
            <tr ref={bind("measureRowRef")}>
              {/* No, Bal, Col, Item, Lot */}
              <td class="p-1 text-center h-5"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1"></td>
              <td class="p-1"></td>
              <td class="p-1"></td>
              {/* N kolom roll */}
              <For each={Array.from({ length: maxCol })}>{() => <td class="p-1 text-right"></td>}</For>
              {/* TTL */}
              <td class="p-1 text-right"></td>
              <td class="p-1 text-right"></td>
              <td class="p-1 text-right"></td>
            </tr>
          </tbody>
        </table>

        {/* HEADER — logo + judul di TENGAH */}
        <div className="header-center">
          <div
            style={{
              height: isPPN ? "var(--logo-size)" : "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <img
              src={logoNavel}
              alt="Logo"
              style={{
                height: "var(--logo-size)",
                display: isPPN ? "block" : "none"
              }}
              onLoad={recalc}
            />
          </div>
          <div className="title">PACKING LIST</div>
        </div>

        {/* Info blok atas */}
        <table className="no-border" style={{ border: "none", width: "100%" }}>
          <tbody>
            <tr>
              <td className="no-border"><b>No PL:</b> {data?.no_pl || "-"}</td>
              <td className="no-border" style={{ textAlign: "right" }}><b>No SO:</b> {data?.sales_order_items?.no_so || "-"}</td>
            </tr>
            <tr>
              <td className="no-border"><b>Customer:</b> {data?.sales_order_items?.customer_name || "-"}</td>
              <td className="no-border" style={{ textAlign: "right" }}><b>Tanggal Pembuatan:</b> {createdShort}</td>
            </tr>
            <tr>
              <td className="no-border"><b>Keterangan:</b> <span style={{ whiteSpace: "pre-line" }}>{data?.keterangan || "-"}</span></td>
            </tr>
          </tbody>
        </table>

        {/* TABEL UTAMA */}
        <table ref={bind("tableRef")} className="border border-black table-fixed">
          <ColGroup />
          <thead ref={bind("theadRef")} className="bg-gray-200">
            <tr>
              <th rowSpan={2}>No</th>
              <th rowSpan={2}>Bal</th>
              <th rowSpan={2}>Col</th>
              <th rowSpan={2}>Item</th>
              <th rowSpan={2}>Lot</th>
              <For each={Array.from({ length: maxCol })}>
                {(_, i) => <th>{i() + 1}</th>}
              </For>
              <th rowSpan={2}>TTL/PCS</th>
              <th rowSpan={2}>TTL/MTR</th>
              <th rowSpan={2}>TTL/YARD</th>
            </tr>
            <tr></tr>
          </thead>

          <tbody ref={bind("tbodyRef")}>
            <For each={items}>
              {(row) => (
                <Show
                  when={row.type === "row"}
                  fallback={
                    // SUBTOTAL
                    <tr>
                      <td colSpan={5} className="text-center"><b>SUB TOTAL</b></td>
                      <For each={Array.from({ length: maxCol })}>{() => <td></td>}</For>
                      <td className="text-right"><b>{fmt2Blank(row.gPcs)}</b></td>
                      <td className="text-right"><b>{fmt2Blank(row.gMtr)}</b></td>
                      <td className="text-right"><b>{fmt2Blank(row.gYrd)}</b></td>
                    </tr>
                  }
                >
                  <tr>
                    <td className="text-center">{row.isFirst ? (row.gi + 1) : ""}</td>
                    <td className="text-center">{row.bal ?? ""}</td>
                    <td className="text-center">{row.isFirst ? (row.colorDesc ?? "") : ""}</td>
                    <td className="text-center">{row.isFirst ? (row.itemName ?? "-") : ""}</td>
                    <td className="text-center">{row.lot ?? ""}</td>

                    {/* kolom roll dinamis */}
                    <For each={Array.from({ length: maxCol })}>
                      {(_, ci) => (
                        <td className="text-right">
                          {fmt2Blank(row.rowRolls[ci()]?.[unitKey])}
                        </td>
                      )}
                    </For>

                    <td className="text-right">{fmt2Blank(row.pcsRow)}</td>
                    <td className="text-right">{fmt2Blank(row.mRow)}</td>
                    <td className="text-right">{fmt2Blank(row.yRow)}</td>
                  </tr>
                </Show>
              )}
            </For>

            {/* ROW KOSONG DINAMIS */}
            <For each={Array.from({ length: extraRows() })}>
              {() => (
                <tr className="stretch-row">
                  <td className="p-1 text-center h-5"></td>
                  <td className="p-1 text-center"></td>
                  <td className="p-1 text-center"></td>
                  <td className="p-1"></td>
                  <td className="p-1 text-center"></td>
                  <For each={Array.from({ length: maxCol })}>
                    {() => <td className="p-1 text-right"></td>}
                  </For>
                  <td className="p-1 text-right"></td>
                  <td className="p-1 text-right"></td>
                  <td className="p-1 text-right"></td>
                </tr>
              )}
            </For>
          </tbody>

          <tfoot ref={bind("tfootRef")}>
            <Show when={isLast}>
              <tr>
                <td colSpan={5} className="text-center"><b>TOTAL</b></td>
                <For each={Array.from({ length: maxCol })}>{() => <td></td>}</For>
                <td className="text-right"><b>{fmt2Blank(totals.pcs)}</b></td>
                <td className="text-right"><b>{fmt2Blank(totals.m)}</b></td>
                <td className="text-right"><b>{fmt2Blank(totals.y)}</b></td>
              </tr>
            </Show>
            <tr>
              <td colSpan={5 + maxCol + 3} className="no-border text-right" style={{ borderTop: "1px solid #000" }}>
                <i>Halaman {pageNo} dari {pageCount}</i>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// Utils
function fmt2Blank(v) {
  const n = Number(v);
  if (!isFinite(n) || n === 0) return "";    // 0 → kosong
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
}

import { createMemo, createEffect, For, Show } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import { splitIntoPagesWithOffsets, createStretch } from "../../../components/PrintUtils";

export default function PackingOrderPrint(props) {
  // Normalisasi root data (dukung {order: {...}} atau {...} langsung)
  const root = props.data?.order ?? props.data ?? {};

  // ===== Formatter =====
  function formatTanggal(s) {
    if (!s) return "-";
    const d = new Date(s);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }
  function formatAngka(v, decimals = 2) {
    const n = typeof v === "number" ? v : parseFloat(v || 0);
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n || 0);
  }

  // Unit & PPN
  const unit = createMemo(() => root.satuan_unit || root.satuan_unit_name || "Meter");
  const isPPN = createMemo(() => Number(root.ppn ?? root.ppn_percent) > 0);

  /**
   * Buat baris tampilan:
   * - Jika backend mengirim `packing_lists[].items` -> langsung pakai field item
   * - Jika UI mengirim `itemGroups[].items` (roll) -> kelompokkan per packing_list_item_id
   */
  const displayRows = createMemo(() => {
    // CASE 1: dari backend (punya packing_lists dan item sudah agregat)
    if (Array.isArray(root.packing_lists)) {
      return root.packing_lists.flatMap(pl =>
        (pl.items || []).map(it => ({
          kode: it.corak_kain ?? "-",
          jenis: it.konstruksi_kain ?? "-",
          warna: it.deskripsi_warna ?? "-",
          grade: it.grade_name ?? "-",
          lot: (it.lot ?? pl.lot ?? root.lot ?? "-") || "-",
          rolls_count: (it.rolls || []).length,
          meter_total: parseFloat(it.meter_total || 0),
          yard_total: parseFloat(it.yard_total || 0),
        }))
      );
    }

    // CASE 2: dari form (itemGroups: roll-level)
    if (Array.isArray(root.itemGroups)) {
      const out = [];
      for (const g of root.itemGroups) {
        const lot = g?.lot || "-";
        const by = new Map(); // key: packing_list_item_id
        for (const r of g.items || []) {
          // Kalau ingin hanya roll yang dipilih, uncomment baris di bawah:
          // if (!r.checked) continue;
          const key = r.packing_list_item_id ?? `${r.konstruksi_kain}|${lot}`;
          let acc = by.get(key);
          if (!acc) {
            acc = {
              kode: r.corak_kain ?? "-",            // biasanya tidak ada di roll -> "-"
              jenis: r.konstruksi_kain ?? "-",
              warna: r.deskripsi_warna ?? "-",       // biasanya tidak ada di roll -> "-"
              grade: r.grade_name ?? "-",            // biasanya tidak ada di roll -> "-"
              lot,
              meter_total: 0,
              yard_total: 0,
              rolls_count: 0,
            };
            by.set(key, acc);
          }
          acc.meter_total += parseFloat(r.meter || 0);
          acc.yard_total  += parseFloat(r.yard || 0);
          acc.rolls_count += 1;
        }
        out.push(...by.values());
      }
      return out;
    }

    // fallback
    return [];
  });

  // Totals berdasarkan baris tampilan
  const totalMeter = createMemo(() =>
    displayRows().reduce((s, it) => s + (parseFloat(it.meter_total) || 0), 0)
  );
  const totalYard = createMemo(() =>
    displayRows().reduce((s, it) => s + (parseFloat(it.yard_total) || 0), 0)
  );

  // ===== Pagination =====
  const ROWS_FIRST_PAGE  = 15; // kapasitas item halaman 1
  const ROWS_OTHER_PAGES = 24; // kapasitas item halaman 2+
  const pagesWithOffsets = createMemo(() =>
    splitIntoPagesWithOffsets(displayRows(), ROWS_FIRST_PAGE, ROWS_OTHER_PAGES)
  );

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        html, body {
          margin: 0; padding: 0; height: 100%; width: 100%;
          -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          font-family: sans-serif;
        }
        .page {
          width: 210mm;
          height: 297mm;
          padding: 5mm;
          box-sizing: border-box;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        @media print {
          .page { page-break-after: always; }
          .page:last-child { page-break-after: auto; }
        }
      `}</style>

      <For each={pagesWithOffsets()}>
        {(p, idx) => {
          const pageIndex = idx();
          const count     = pagesWithOffsets().length;
          const isLast    = pageIndex === count - 1;
          return (
            <PrintPage
              data={root}
              items={p.items}
              startIndex={p.offset}  // Penomoran lanjut saat new page
              pageNo={pageIndex + 1}
              pageCount={count}
              isPPN={isPPN()}
              isLast={isLast}
              totals={{
                totalMeter: totalMeter(),
                totalYard: totalYard(),
              }}
              formatters={{ formatTanggal, formatAngka }}
              unit={unit()}
              logoNavel={logoNavel}
            />
          );
        }}
      </For>
    </>
  );
}

/* ===== Halaman dengan stretch ===== */
function PrintPage(props) {
  const { data, items, startIndex, pageNo, pageCount, isPPN, isLast, totals, formatters, unit, logoNavel } = props;
  const { formatTanggal, formatAngka } = formatters;

  const { extraRows, bind, recalc } = createStretch({ fudge: 25 });

  createEffect(() => {
    (items?.length ?? 0);
    isLast;            // depend supaya recalc dipanggil waktu last/first berubah
    requestAnimationFrame(recalc);
  });

  return (
    <div ref={bind("pageRef")} className="page">
      {/* row measurer khusus halaman ini */}
      <table style="position:absolute; top:-10000px; left:-10000px; visibility:hidden;">
        <tbody>
          <tr ref={bind("measureRowRef")}>
            <td class="p-1 text-center h-5"></td>
            <td class="p-1 text-center"></td>
            <td class="p-1"></td>
            <td class="p-1 text-center"></td>
            <td class="p-1 text-center"></td>
            <td class="p-1 text-right"></td>
            <td class="p-1 text-right"></td>
            <td class="p-1 text-right"></td>
          </tr>
        </tbody>
      </table>

      {/* HEADER (ditampilkan di semua halaman) */}
      <img className="w-24" src={logoNavel} alt="" onLoad={recalc} hidden={!isPPN} />
      <h1 className="text-xl uppercase font-bold">Surat Jalan</h1>

      <div className="w-full flex gap-2 text-sm">
        {/* LEFT TABLE */}
        <table className="w-[55%] border-2 border-black text-[13px] table-fixed">
          <tbody>
            <tr>
              <td className="px-2 pt-1 max-w-[300px] break-words whitespace-pre-wrap" colSpan={2}>
                Kepada Yth:
              </td>
            </tr>
            <tr>
              <td className="px-2 max-w-[300px] break-words whitespace-pre-wrap" colSpan={2}>
                {data.customer_name}
              </td>
            </tr>
          </tbody>
        </table>

        {/* RIGHT TABLE */}
        <table className="w-[55%] border-2 border-black table-fixed text-sm">
          <tbody>
            <tr>
              <td className="font-bold px-2 w-[30%] whitespace-nowrap">No. SJ</td>
              <td className="w-[5%] text-center">:</td>
              <td className="px-2 break-words w-[65%]">{data.no_sj || data.sequence_number}</td>
            </tr>
            <tr>
              <td className="font-bold px-2 w-[30%] whitespace-nowrap">Tanggal</td>
              <td className="w-[5%] text-center">:</td>
              <td className="px-2 break-words w-[65%]">
                {formatTanggal(data.tanggal_surat_jalan || data.created_at)}
              </td>
            </tr>
            <tr>
              <td className="font-bold px-2 w-[30%] whitespace-nowrap">No. SO</td>
              <td className="w-[5%] text-center">:</td>
              <td className="px-2 break-words w-[65%]">{data.no_so}</td>
            </tr>
            <tr>
              <td className="font-bold px-2 w-[30%] whitespace-nowrap">No. Mobil</td>
              <td className="w-[5%] text-center">:</td>
              <td className="px-2 break-words w-[65%]">{data.no_mobil}</td>
            </tr>
            <tr>
              <td className="font-bold px-2 w-[30%] whitespace-nowrap">Sopir</td>
              <td className="w-[5%] text-center">:</td>
              <td className="px-2 break-words w-[65%]">{data.sopir}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ITEM TABLE */}
      <table ref={bind("tableRef")} className="w-full table-fixed border border-black text-[12px] border-collapse mt-3">
        <thead ref={bind("theadRef")} className="bg-gray-200">
          <tr>
            <th className="border border-black p-1 w-[6%]" rowSpan={2}>No</th>
            <th className="border border-black p-1 w-[8%]" rowSpan={2}>Kode</th>
            <th className="border border-black p-1 w-[18%]" rowSpan={2}>Jenis Kain</th>
            <th className="border border-black p-1 w-[15%]" rowSpan={2}>Warna</th>
            <th className="border border-black p-1 w-[6%]" rowSpan={2}>Grade</th>
            <th className="border border-black p-1 w-[15%]" rowSpan={2}>Lot</th>
            <th className="border border-black p-1 w-[20%] text-center" colSpan={2}>
              Quantity
            </th>
          </tr>
          <tr>
            <th colSpan={2} className="border border-black p-1 w-[24%]">
              {`(Roll / ${unit})`}
            </th>
          </tr>
        </thead>

        <tbody ref={bind("tbodyRef")}>
          <For each={items}>
            {(it, i) => (
              <tr>
                <td className="p-1 text-center break-words">{startIndex + i() + 1}</td>
                <td className="p-1 text-center break-words">{it.kode}</td>
                <td className="p-1 break-words">{it.jenis}</td>
                <td className="p-1 text-center break-words">{it.warna}</td>
                <td className="p-1 text-center break-words">{it.grade}</td>
                <td className="p-1 text-center break-words">{it.lot}</td>
                <td colSpan={2} className="p-1 text-center break-words">
                  {unit === "Yard"
                    ? `${it.rolls_count} / ${formatAngka(it.yard_total)}`
                    : `${it.rolls_count} / ${formatAngka(it.meter_total)}`
                  }
                </td>
              </tr>
            )}
          </For>

          {/* ROW KOSONG DINAMIS (auto-stretch) */}
          <For each={Array.from({ length: extraRows() })}>
            {() => (
              <tr>
                <td className="p-1 text-center h-5"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-center" colSpan={2}></td>
              </tr>
            )}
          </For>
        </tbody>

        <tfoot ref={bind("tfootRef")}>
          {/* Total lengkap hanya di halaman terakhir */}
          <Show when={isLast}>
            <tr>
              <td colSpan={6} className="border border-black text-right font-bold px-2 py-1">
                TOTAL
              </td>
              <td colSpan={2} className="border border-black px-2 py-1 text-center font-bold">
                {unit === "Yard" ? formatAngka(totals.totalYard) : formatAngka(totals.totalMeter)}
              </td>
            </tr>
            <tr>
              <td colSpan={8} className="border border-black p-2 align-top">
                <div className="font-bold mb-1">NOTE:</div>
                <div className="whitespace-pre-wrap break-words italic">
                  {data.keterangan ?? "-"}
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={8} className="border border-black">
                <div className="w-full flex justify-between text-[12px] py-5 px-2">
                  <div className="text-center w-1/3">
                    Yang Menerima
                    <br /><br /><br /><br />( ...................... )
                  </div>
                  <div className="text-center w-1/3">
                    Menyetujui
                    <br /><br /><br /><br />( ...................... )
                  </div>
                  <div className="text-center w-1/3">
                    Yang Membuat
                    <br /><br /><br /><br />( ...................... )
                  </div>
                </div>
              </td>
            </tr>
          </Show>
          <tr>
            <td colSpan={8} className="border border-black px-2 py-1 text-right italic">
              Halaman {pageNo} dari {pageCount}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

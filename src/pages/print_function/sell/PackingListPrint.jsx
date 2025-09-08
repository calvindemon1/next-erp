import logoNavel from "../../../assets/img/navelLogo.png";

export default function PackingListPrintLandscape({ data }) {
  const MAX_COL = 5;

  // 2) Format tanggal: "dd MMMM yyyy" (Indonesia), diletakkan kanan atas tabel
  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // 5) Kolom roll mengikuti satuan_unit (Yard → pakai 'yard', selain itu pakai 'meter')
  const unit = (data?.satuan_unit || data?.sales_order_items?.satuan_unit || "")
    .toString()
    .toLowerCase();
  const ROLL_KEY = unit === "yard" ? "yard" : "meter";

  function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "-";
    const num = Number(value);
    if (Number.isNaN(num)) return "-";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  // 3) "Item" adalah corak_kain (ambil dari sales_order_items.items)
  const itemsMap = Object.fromEntries(
    (data?.sales_order_items?.items || []).map((item) => [item.id, item.corak_kain])
  );

  // Hitung total semua group (untuk TOTAL bawah)
  let grandTotalPcs = 0;
  let grandTotalMeter = 0;
  let grandTotalYard = 0;

  return (
    <>
      <style>{`
        /* 7) Tidak ada kontrol CSS untuk header/footer browser.
              Tapi kita pastikan layout rapi untuk cetak. */
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        @media print {
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          /* Hilangkan margin default agar tidak menambah ruang ekstra */
          body { margin: 0; }
        }
        body {
          font-family: Arial, sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          page-break-inside: auto;
        }
        th, td {
          border: 1px solid black;
          padding: 2px 4px;
          font-size: 12px;
        }
        th { text-align: center; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .no-border { border: none !important; }
        .header-info { margin-bottom: 10px; page-break-after: avoid; }
        .title { margin: 5px 0 2px 0; font-weight: 600; }
      `}</style>

      {/* 1) "Navel ERP" dihilangkan; hanya judul & logo (kondisional) */}
      <div
        className="flex flex-col items-center text-center"
        style={{ textAlign: "center", marginBottom: "6px" }}
      >
        {/* 4) Logo hanya muncul jika ppn_percent > 0 */}
        {Number(data?.sales_order_items?.ppn_percent) > 0 && (
          <img src={logoNavel} alt="Logo" style={{ height: "40px" }} />
        )}
        <h2 className="title">PACKING LIST</h2>
      </div>

      {/* INFORMASI PL & SO */}
      <div className="header-info">
        <table style={{ border: "none", width: "100%" }}>
          <tbody>
            <tr>
              <td style={{ border: "none" }}>
                <span className="text-md font-bold">No PL:</span>{" "}
                <span className="text-md">{data?.no_pl || "-"}</span>
              </td>
              <td style={{ border: "none" }}>
                <span className="text-md font-bold">No SO:</span>{" "}
                <span className="text-md">{data?.sales_order_items?.no_so || "-"}</span>
              </td>
            </tr>
            {/* 6) Tambahkan customer di bawah No PL */}
            <tr>
              <td style={{ border: "none" }}>
                <span className="text-md font-bold">Customer:</span>{" "}
                <span className="text-md">{data?.sales_order_items?.customer_name || "-"}</span>
              </td>
              <td style={{ border: "none" }}>
                <span className="text-md font-bold">Keterangan:</span>{" "}
                <span className="text-md" style={{ whiteSpace: "pre-line" }}>
                  {data?.keterangan || "-"}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2) Tanggal di kanan atas tabel */}
      <div style={{ width: "100%", textAlign: "right", margin: "4px 0" }}>
        <span style={{ fontSize: "12px" }}>{todayStr}</span>
      </div>

      {/* TABLE */}
      <table>
        <thead>
          <tr>
            <th rowSpan={2}>No</th>
            <th rowSpan={2}>Col</th>
            <th rowSpan={2}>Item</th>
            {[...Array(MAX_COL)].map((_, i) => (
              <th key={i}>{i + 1}</th>
            ))}
            <th rowSpan={2}>TTL/PCS</th>
            <th rowSpan={2}>TTL/MTR</th>
            <th rowSpan={2}>TTL/YARD</th>
          </tr>
          <tr></tr>
        </thead>
        <tbody>
          {(data?.itemGroups || []).map((group, gi) => {
            const groupName =
              itemsMap[group.so_item_id] || itemsMap[group.item] || group.item || "-";

            // Sub total per group
            const groupTotalPcs = group.rolls.filter((r) => r?.[ROLL_KEY]).length;
            const groupTotalMeter = group.rolls.reduce(
              (sum, r) => sum + (parseFloat(r.meter) || 0),
              0
            );
            const groupTotalYard = group.rolls.reduce(
              (sum, r) => sum + (parseFloat(r.yard) || 0),
              0
            );

            // Grand total
            grandTotalPcs += groupTotalPcs;
            grandTotalMeter += groupTotalMeter;
            grandTotalYard += groupTotalYard;

            // Baris-baris dalam group
            const rowCount = Math.ceil(group.rolls.length / MAX_COL);

            return [
              ...Array.from({ length: rowCount }).map((_, rowIdx) => {
                const startIdx = rowIdx * MAX_COL;
                const rowRolls = group.rolls.slice(startIdx, startIdx + MAX_COL);

                const no = rowIdx === 0 ? gi + 1 : "";
                const totalPcsRow = rowRolls.filter((r) => r?.[ROLL_KEY]).length;
                const totalMeterRow = rowRolls.reduce(
                  (sum, r) => sum + (parseFloat(r.meter) || 0),
                  0
                );
                const totalYardRow = rowRolls.reduce(
                  (sum, r) => sum + (parseFloat(r.yard) || 0),
                  0
                );

                return (
                  <tr key={`g${gi}-r${rowIdx}`}>
                    <td className="text-center">{no}</td>
                    <td className="text-center">{rowIdx === 0 ? group.col : ""}</td>
                    <td className="text-center">{rowIdx === 0 ? groupName : ""}</td>

                    {Array.from({ length: MAX_COL }).map((_, ci) => (
                      <td className="text-right" key={`g${gi}-r${rowIdx}-c${ci}`}>
                        {rowRolls[ci]?.[ROLL_KEY]
                          ? formatNumber(rowRolls[ci][ROLL_KEY])
                          : ""}
                      </td>
                    ))}

                    <td className="text-right">{formatNumber(totalPcsRow)}</td>
                    <td className="text-right">{formatNumber(totalMeterRow)}</td>
                    <td className="text-right">{formatNumber(totalYardRow)}</td>
                  </tr>
                );
              }),

              // SUB TOTAL PER GROUP
              <tr key={`g${gi}-subtotal`}>
                <td colSpan={3} className="text-center">
                  <b>SUB TOTAL</b>
                </td>
                {[...Array(MAX_COL)].map((_, i) => (
                  <td key={`g${gi}-stc${i}`}></td>
                ))}
                <td className="text-right">
                  <b>{formatNumber(groupTotalPcs)}</b>
                </td>
                <td className="text-right">
                  <b>{formatNumber(groupTotalMeter)}</b>
                </td>
                <td className="text-right">
                  <b>{formatNumber(groupTotalYard)}</b>
                </td>
              </tr>,
            ];
          })}

          {/* GRAND TOTAL */}
          <tr>
            <td colSpan={3} className="text-center">
              <b>TOTAL</b>
            </td>
            {[...Array(MAX_COL)].map((_, i) => (
              <td key={`gtc${i}`}></td>
            ))}
            <td className="text-right">
              <b>{formatNumber(grandTotalPcs)}</b>
            </td>
            <td className="text-right">
              <b>{formatNumber(grandTotalMeter)}</b>
            </td>
            <td className="text-right">
              <b>{formatNumber(grandTotalYard)}</b>
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

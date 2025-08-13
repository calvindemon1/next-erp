import logoNavel from "../../../assets/img/navelLogo.png";

export default function PackingListPrintLandscape({ data }) {
  const MAX_COL = 5;

  function formatNumber(value) {
    if (!value && value !== 0) return "-";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  const itemsMap = Object.fromEntries(
    (data?.sales_order_items?.items || []).map((item) => [
      item.id,
      `${item.corak_kain} - ${item.deskripsi_warna}`,
    ])
  );

  // Hitung total semua group (untuk TOTAL bawah)
  let grandTotalPcs = 0;
  let grandTotalMeter = 0;
  let grandTotalYard = 0;

  return (
    <>
      <style>{`
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        @media print {
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
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
        th {
          text-align: center;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .no-border { border: none !important; }
        .header-info {
          margin-bottom: 10px;
          page-break-after: avoid;
        }
      `}</style>

      {/* HEADER LOGO & INFO — Halaman pertama */}
      <div
        class="flex flex-col items-center text-center"
        style={{ textAlign: "center", marginBottom: "10px" }}
      >
        <img src={logoNavel} alt="Logo" style={{ height: "40px" }} />
        <h2 style={{ margin: "5px 0" }}>PACKING LIST</h2>
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
                <span className="text-md">
                  {data?.sales_order_items.no_so || "-"}
                </span>
              </td>
            </tr>
            <tr>
              <td style={{ border: "none" }}>
                <span className="text-md font-bold">Keterangan:</span>{" "}
                <span className="text-md">{data?.keterangan || "-"}</span>
              </td>
            </tr>
          </tbody>
        </table>
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
            // Pastikan nama itemnya langsung dari mapping
            const groupName = itemsMap[group.so_item_id] || group.item || "-";

            // Hitung sub total group
            const groupTotalPcs = group.rolls.filter((r) => r.meter).length;
            const groupTotalMeter = group.rolls.reduce(
              (sum, r) => sum + (parseFloat(r.meter) || 0),
              0
            );
            const groupTotalYard = group.rolls.reduce(
              (sum, r) => sum + (parseFloat(r.yard) || 0),
              0
            );

            // Tambah ke grand total
            grandTotalPcs += groupTotalPcs;
            grandTotalMeter += groupTotalMeter;
            grandTotalYard += groupTotalYard;

            // Hitung jumlah baris dalam group
            const rowCount = Math.ceil(group.rolls.length / MAX_COL);

            // Return array of rows, bukan fragment
            return [
              ...Array.from({ length: rowCount }).map((_, rowIdx) => {
                const startIdx = rowIdx * MAX_COL;
                const rowRolls = group.rolls.slice(
                  startIdx,
                  startIdx + MAX_COL
                );

                const no = rowIdx === 0 ? gi + 1 : "";
                const totalPcsRow = rowRolls.filter((r) => r.meter).length;
                const totalMeterRow = rowRolls.reduce(
                  (sum, r) => sum + (parseFloat(r.meter) || 0),
                  0
                );
                const totalYardRow = rowRolls.reduce(
                  (sum, r) => sum + (parseFloat(r.yard) || 0),
                  0
                );

                return (
                  <tr>
                    <td className="text-center">{no}</td>
                    <td className="text-center">
                      {rowIdx === 0 ? group.col : ""}
                    </td>
                    <td className="text-center">
                      {rowIdx === 0 ? groupName : ""}
                    </td>

                    {Array.from({ length: MAX_COL }).map((_, ci) => (
                      <td className="text-right">
                        {rowRolls[ci]?.meter
                          ? formatNumber(rowRolls[ci].meter)
                          : ""}
                      </td>
                    ))}

                    <td className="text-right">{formatNumber(totalPcsRow)}</td>
                    <td className="text-right">
                      {formatNumber(totalMeterRow)}
                    </td>
                    <td className="text-right">{formatNumber(totalYardRow)}</td>
                  </tr>
                );
              }),

              // SUB TOTAL PER GROUP
              <tr>
                <td colSpan={3} className="text-center">
                  <b>SUB TOTAL</b>
                </td>
                {[...Array(MAX_COL)].map(() => (
                  <td></td>
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
            {[...Array(MAX_COL)].map(() => (
              <td></td>
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

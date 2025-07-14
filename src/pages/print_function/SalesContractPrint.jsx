export default function PackingOrderPrint(props) {
  const data = props.data;

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: sans-serif;
        }
      `}</style>

      <div
        style={{
          position: "relative",
          width: "210mm",
          height: "297mm",
          overflow: "hidden",
          padding: "20mm",
        }}
      >
        <h1
          style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}
        >
          Sales Contract
        </h1>

        <table
          style={{ width: "100%", fontSize: "12px", marginBottom: "20px" }}
        >
          <tbody>
            <tr>
              <td style={{ fontWeight: "bold", width: "150px" }}>Type</td>
              <td>{data.type}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>No. Sales Contract</td>
              <td>{data.no_pesan}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>PO Customer</td>
              <td>{data.po_cust}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>Validity Contract</td>
              <td>{data.validity_contract}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>Customer ID</td>
              <td>{data.customer_id}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>Currency ID</td>
              <td>{data.currency_id}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>Kurs</td>
              <td>{data.kurs}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>Termin (Hari)</td>
              <td>{data.termin}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>PPN (%)</td>
              <td>{data.ppn_percent}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>Catatan</td>
              <td>{data.catatan}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>Satuan Unit ID</td>
              <td>{data.satuan_unit_id}</td>
            </tr>
          </tbody>
        </table>

        <h2
          style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px" }}
        >
          Items
        </h2>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
          }}
        >
          <thead style={{ backgroundColor: "#eee" }}>
            <tr>
              <th style={{ border: "1px solid #000", padding: "4px" }}>
                Kain ID
              </th>
              <th style={{ border: "1px solid #000", padding: "4px" }}>
                Grade ID
              </th>
              <th style={{ border: "1px solid #000", padding: "4px" }}>
                Lebar
              </th>
              <th style={{ border: "1px solid #000", padding: "4px" }}>
                Gramasi
              </th>
              <th style={{ border: "1px solid #000", padding: "4px" }}>
                Meter Total
              </th>
              <th style={{ border: "1px solid #000", padding: "4px" }}>
                Yard Total
              </th>
              <th style={{ border: "1px solid #000", padding: "4px" }}>
                Kilogram Total
              </th>
              <th style={{ border: "1px solid #000", padding: "4px" }}>
                Harga
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item, i) => (
              <tr key={i}>
                <td style={{ border: "1px solid #000", padding: "4px" }}>
                  {item.kain_id}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px" }}>
                  {item.grade_id}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px" }}>
                  {item.lebar}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px" }}>
                  {item.gramasi}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px" }}>
                  {item.meter_total}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px" }}>
                  {item.yard_total}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px" }}>
                  {item.kilogram_total ?? "-"}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px" }}>
                  {item.harga?.toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

import { createMemo, createSignal, onMount } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";

export default function SalesOrderPrint(props) {
  const data = props.data;

  function formatAngka(value, decimals = 2) {
    if (typeof value !== "number") {
      value = parseFloat(value) || 0;
    }
    if (value === 0) {
        return "0,00";
    }
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  function formatAngkaNonDecimal(value, decimals = 0) {
    if (typeof value !== "number") {
      value = parseFloat(value) || 0;
    }
    if (value === 0) {
        return "0,00";
    }
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  function formatRupiah(value, decimals = 2) {
    if (typeof value !== "number") {
      value = parseFloat(value) || 0;
    }
     if (value === 0) {
        return "Rp 0,00";
    }
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  function formatTanggal(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);

    // contoh format dd-mm-yyyy
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  const itemsPerPage = 14;
  const itemPages = paginateItems(data.items ?? [], itemsPerPage);

  function paginateItems(items, itemsPerPage) {
    const pages = [];
    for (let i = 0; i < items.length; i += itemsPerPage) {
      pages.push(items.slice(i, i + itemsPerPage));
    }
    return pages;
  }

  const totalMeter = createMemo(() => 
      parseFloat(data.summary?.total_meter || 0)
  );

  const totalYard = createMemo(() =>
      parseFloat(data.summary?.total_yard || 0)
  );

  const totalKilogram = createMemo(() =>
    parseFloat(data.summary?.total_kilogram || 0)
  );

  const isPPN = createMemo(() => parseFloat(data.ppn_percent) > 0);

  const subTotal = createMemo(() => Number(data?.summary?.subtotal) || 0);

  const dpp = createMemo(() => subTotal() / 1.11);

  const nilaiLain = createMemo(() => dpp() * (11 / 12));

  const ppn = createMemo(() => (isPPN() ? nilaiLain() * 0.12 : 0));

  const jumlahTotal = createMemo(() => dpp() + ppn());

  // kumpulkan ke dalam object akhir
  const dataAkhir = {
    subtotal: subTotal(),
    dpp: dpp(),
    nilai_lain: nilaiLain(),
    ppn: ppn(),
    total: jumlahTotal(),
  };

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
        @media print {
          .page {
            page-break-after: always;
          }
        }
      `}</style>

      <div
        className="flex flex-col items-center gap-2"
        style={{
          position: "relative",
          width: "210mm",
          height: "297mm",
          overflow: "hidden",
          padding: "5mm",
        }}
      >
        <img
          className="w-24"
          hidden={!isPPN()}
          src={logoNavel}
          alt=""
        />
        <h1 className="text-2xl uppercase font-bold">Sales Order</h1>

        <div className="w-full flex gap-2 text-sm">
          {/* LEFT TABLE */}
          <table className="w-[55%] border-2 border-black text-[13px] table-fixed">
            <tbody>
              <tr>
                <td
                  className="px-2 pt-1 max-w-[300px] break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  Kepada Yth:
                </td>
              </tr>
              <tr>
                <td
                  className="px-2 max-w-[300px] break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  {data.customer_name}
                </td>
              </tr>
              <tr>
                <td
                  className="px-2 max-w-[300px] leading-relaxed break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  {data.alamat || "-"}
                </td>
              </tr>
              {/* <tr>
                <td
                  className="px-2 max-w-[300px] break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  KERTOHARJO PEKALONGAN SEL
                </td>
              </tr> */}
              <tr>
                <td className="px-2 py-1 whitespace-nowrap">
                  Telp: {data.customer_telp || "-"}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  Fax: {data.customer_fax || "-"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* MIDDLE TABLE */}
          <div className="flex flex-col gap-2 w-[20%]">
            <table className="h-full border-2 border-black table-fixed w-full">
              <tbody>
                <tr>
                  <td className="px-2 pt-1 text-center align-top break-words max-w-[180px]">
                    No Sales Contract
                  </td>
                </tr>
                <tr>
                  <td className="px-2 pb-1 text-xs text-center break-words max-w-[180px]">
                    {data.no_sc}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RIGHT TABLE */}
          <table className="w-[35%] border-2 border-black table-fixed text-sm">
            <tbody>
              {[
                { label: "No. SO", value: data.no_so },
                { label: "Tanggal", value: formatTanggal(data.created_at) },
                {
                  label: "Tgl Kirim",
                  value: formatTanggal(data.delivery_date) ?? "-",
                },
                { label: "Payment", value: data.termin == 0 ? "Cash" : data.termin + " Hari" },
              ].map((row, idx) => (
                <tr key={idx} className="border-b border-black">
                  <td className="font-bold px-2 w-[30%] whitespace-nowrap">
                    {row.label}
                  </td>
                  <td className="w-[5%] text-center">:</td>
                  <td className="px-2 break-words w-[65%]">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ITEM TABLE */}
        <table className="w-full table-fixed border border-black text-[12px] border-collapse mt-3">
          <thead className="bg-gray-200">
            <tr>
              <th className="border border-black p-1 w-[6%]" rowSpan={2}>No</th>
              <th className="border border-black p-1 w-[10%]" rowSpan={2}>Kode</th>
              <th className="border border-black p-1 w-[20%]" rowSpan={2}>Jenis Kain</th>
              <th className="border border-black p-1 w-[8%]" rowSpan={2}>Grade</th>
              <th className="border border-black p-1 w-[12%]" rowSpan={2}>Warna</th>
              <th className="border border-black p-1 w-[10%]" rowSpan={2}>Lebar Finish</th>
              <th className="border border-black p-1 w-[10%]" rowSpan={2}>Gramasi</th>
              <th className="border border-black p-1 w-[18%] text-center" colSpan={2}>
                Quantity
              </th>
              <th hidden className="border border-black p-1 w-[18%]" rowSpan={2}>Harga</th>
              <th hidden className="border border-black p-1 w-[20%]" rowSpan={2}>Total</th>
            </tr>
            <tr>
              <th colspan={2} className="border border-black p-1 w-[24%]">
                {`(${data.satuan_unit || 'Meter'})`}
              </th>
            </tr>
          </thead>
          <tbody>
            {(data?.items || []).map((item, i) => {
              return (
                <tr key={i}>
                  <td className="p-1 text-center break-words">{i + 1}</td>
                  <td className="p-1 text-center break-words">{item.corak_kain || "-"}</td>
                  <td className="p-1 break-words">{item.konstruksi_kain}</td>
                  <td className="p-1 text-center break-words">{item.grade_name}</td>
                  <td className="p-1 text-center break-words">{item.deskripsi_warna || "-"}</td>
                  <td className="p-1 text-center break-words">{formatAngkaNonDecimal(item.lebar)}"</td>
                  <td className="p-1 text-center break-words">{item.gramasi}</td>
                  <td colSpan={2} className="p-1 text-center break-words">
                    {data.satuan_unit === "Meter"
                      ? formatAngka(item.meter_total || 0)
                      : data.satuan_unit === "Yard"
                      ? formatAngka(item.yard_total || 0)
                      : formatAngka(item.kilogram_total || 0)}
                  </td>
                  <td hidden className="p-1 text-center break-words">{formatRupiah(item.harga)}</td>
                  <td hidden className="p-1 text-right break-words">
                    {(() => {
                      const qty =
                        data.satuan_unit === "Meter"
                          ? parseFloat(item.meter_total || 0)
                          : data.satuan_unit === "Yard"
                          ? parseFloat(item.yard_total || 0)
                          : parseFloat(item.kilogram_total || 0);

                      const harga = parseFloat(item.harga || 0);
                      return harga && qty ? formatRupiah(harga * qty) : "-";
                    })()}
                  </td>
                </tr>
              );
            })}

            {/* Tambahin row kosong */}
            {Array.from({ length: 10 - data.items.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="p-1 text-center h-5"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-right"></td>
                {/* <td className="p-1 text-right"></td> */}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="border font-bold text-right border-black px-2 py-1">Total</td>
              <td colspan={2} className="border border-black px-2 py-1 text-center font-bold">
                  {data.satuan_unit === "Meter"
                      ? formatAngka(totalMeter() || 0)
                      : data.satuan_unit === "Yard"
                      ? formatAngka(totalYard() || 0)
                      : formatAngka(totalKilogram || 0)}
              </td>
              <td hidden className="border border-black px-2 py-1 text-right font-bold">
                Sub Total
              </td>
              <td hidden className="border border-black px-2 py-1 text-right">
                {formatRupiah(subTotal())}
              </td>
            </tr>
            <tr hidden>
              <td colSpan={7} className="px-2 py-1"/>
              <td className="px-2 py-1 text-right font-bold">DPP</td>
              <td className="px-2 py-1 text-right">
                {formatRupiah(dataAkhir.dpp)}
              </td>
            </tr>
            <tr hidden>
              <td colSpan={7} className="px-2 py-1"/>
              <td className="px-2 py-1 text-right font-bold">Nilai Lain</td>
              <td className="px-2 py-1 text-right">
                {formatRupiah(dataAkhir.nilai_lain)}
              </td>
            </tr>
            <tr hidden>
              <td colSpan={8} className="px-2 py-1 text-right font-bold">PPN</td>
              <td className="px-2 py-1 text-right">
                {formatRupiah(dataAkhir.ppn)}
              </td>
            </tr>
            <tr hidden> 
              <td colSpan={8} className="px-2 py-1 text-right font-bold">Jumlah Total</td>
              <td className="px-2 py-1 text-right">
                {formatRupiah(dataAkhir.total)}
              </td>
            </tr>
            <tr>
              <td colSpan={9} className="border border-black p-2 align-top">
                <div className="font-bold mb-1">NOTE:</div>
                <div className="whitespace-pre-wrap break-words italic">
                  {data.keterangan ?? "-"}
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={9} className="border border-black">
                <div className="w-full flex justify-end text-[12px] py-5 px-2">
                  <div className="text-center w-1/3">
                    Customer
                    <br />
                    <br />
                    <br />
                    <br />( ...................... )
                  </div>
                  <div className="text-center w-1/3">
                    Marketing
                    <br />
                    <br />
                    <br />
                    <br />( ...................... )
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

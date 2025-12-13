import {
  createMemo,
  createResource,
  createSignal,
  For,
  onMount,
} from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import { getAllColors, getUser } from "../../../utils/auth";

export default function DetailMemoOrderMatchingPrint(props) {
  const user = getUser();
  const [colors, setColors] = createSignal([]);

  onMount(async () => {
    const [warnaRes] = await Promise.all([getAllColors(user?.token)]);
    const warnaList = warnaRes?.data || warnaRes?.warna || [];

    setColors(warnaList);

    // console.log("props.data:", colors());
  });

  const items = createMemo(() => props.data?.data?.data[0] || {});
  const warnaIds = createMemo(() => {
    try {
      return JSON.parse(items()?.warna_ids || "[]");
    } catch {
      return [];
    }
  });

  const colorMap = createMemo(() => {
    const map = {};
    (colors() || []).forEach((c) => {
      map[c.id] = `${c.kode} - ${c.deskripsi}`;
    });
    return map;
  });

  const warnaNames = createMemo(() =>
    warnaIds().map((id) => colorMap()[id] || "")
  );

  const leftColors = createMemo(() => warnaNames().slice(0, 15));
  const rightColors = createMemo(() => warnaNames().slice(15));

  function formatTanggal(s) {
    if (!s) return "-";
    const d = new Date(s);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 20mm;
        }

        body {
          font-family: Arial, sans-serif;
          color: #000;
          background: white;
        }

        .header {
          margin-bottom: 24px;
        }

        .row {
          margin-bottom: 12px;
        }

        .pantone-item {
          margin-bottom: 6px;
        }

        .note {
          margin-top: 12px;
          font-size: 12px;
        }

        .page {
          min-height: calc(297mm - 40mm); /* tinggi A4 dikurangi margin */
          display: flex;
          flex-direction: column;
        }

        .content {
          flex: 1;
        }

        .footer {
          margin-top: 40px;
        }

        .pantone-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 40px;
          margin-top: 12px;
        }

        .pantone-list ul {
          list-style-type: disc; /* bullet */
          padding-left: 20px;
          margin: 0;
        }

        .pantone-list li {
          margin-bottom: 6px;
          font-size: 14px;
          line-height: 1.4;
        }

      `}</style>

      <div class="page">
        <div class="content">
          {/* HEADER */}
          <div class="header">
            <div>Bandung, {formatTanggal(items()?.created_at)}</div>
            <div>No Memo : {items()?.no_om}</div>
          </div>

          {/* TUJUAN */}
          <div className="row">
            <div>Kepada Yth,</div>
            <div>{/* <b>Ibu Irma</b> */}</div>
            <div>
              <b>{items()?.nama_supplier}</b>
            </div>
          </div>

          {/* PEMBUKA */}
          <p class="mt-7">
            Dengan Hormat,
            <br />
            Bersama ini kami kirimkan <b>PANTONE</b> warna untuk di matching di
            kain <b>{items()?.corak_kain}</b> sebagai berikut :
          </p>

          {/* DAFTAR PANTONE */}
          <div class="pantone-list">
            <ul>
              <For each={leftColors()}>{(nama) => <li>{nama}</li>}</For>
            </ul>

            <ul>
              <For each={rightColors()}>{(nama) => <li>{nama}</li>}</For>
            </ul>
          </div>

          {/* NOTE */}
          <div className="note">
            Note : PANTONE WARNA TERLAMPIR{" "}
            <i>(kembalikan setelah selesai matching)</i>
          </div>
        </div>

        <div class="footer">
          <div>Atas perhatiannya kami ucapkan terima kasih.</div>
          <br />
          <div>Hormat Kami,</div>
          <br />
          <b>PT. NAVEL BERJAYA SEJAHTERA</b>
        </div>
      </div>
    </>
  );
}

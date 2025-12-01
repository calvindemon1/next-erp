import { onCleanup, onMount, createSignal } from "solid-js";
import { get } from "idb-keyval";
import SalesInvoicePrint from "../../pages/print_function/invoice/SalesInvoicePrint";

export default function SalesInvoiceDummyPrint() {
  const [data, setData] = createSignal(null);

  onMount(async () => {
    let parsedData = null;
    let isPreview = false; // Variabel untuk menampung status preview dari URL

    try {
      // Ambil KEY dan PREVIEW status dari URL
      const url = new URL(window.location.href);
      const key = url.searchParams.get("key");
      
      // Cek apakah ada param &preview=true di URL
      isPreview = url.searchParams.get("preview") === "true"; 

      if (!key) throw new Error("Missing key");

      // Ambil data besar dari IndexedDB
      parsedData = await get(key);
      if (!parsedData) throw new Error("IndexedDB return NULL");

      setData(parsedData);
    } catch (e) {
      console.error("Gagal load data print:", e);
      // alert("Data print tidak valid."); // Optional: disable alert agar tidak mengganggu
      window.close();
      return;
    }

    // Cek apakah mode PDF (dari data) atau mode Preview (dari URL)
    // Jika BUKAN pdfMode dan BUKAN isPreview, baru lakukan print otomatis.
    if (!parsedData._pdfMode && !isPreview) {
      const closeAfterPrint = () => window.close();
      window.addEventListener("afterprint", closeAfterPrint);

      // Tunggu render
      setTimeout(() => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => window.print())
        );
      }, 500);

      // fallback auto close
      // setTimeout(() => window.close(), 5000); // Optional: bisa di-comment kalau ingin tab tetap terbuka jika user cancel print

      onCleanup(() =>
        window.removeEventListener("afterprint", closeAfterPrint)
      );
    }
  });

  return (
    <div class="p-6 print:p-0">
      {/* Pastikan data ada sebelum render komponen print */}
      {data() && <SalesInvoicePrint data={data()} />}
    </div>
  );
}
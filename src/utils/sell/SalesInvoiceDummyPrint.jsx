import { onCleanup, onMount, createSignal } from "solid-js";
import SalesInvoicePrint from "../../pages/print_function/invoice/SalesInvoicePrint";

export default function SalesInvoiceDummyPrint() {
  const [data, setData] = createSignal(null);

  onMount(() => {
    try {
      // Payload dikirim via hash: /print/deliverynote-invoice#<ENCODED_JSON>
      const raw = window.location.hash.slice(1);
      const parsed = JSON.parse(decodeURIComponent(raw));
      setData(parsed);
    } catch (e) {
      console.error("Gagal parse data print:", e);
      alert("Data print tidak valid.");
      window.close();
      return;
    }

    const closeAfterPrint = () => window.close();
    window.addEventListener("afterprint", closeAfterPrint);

    // Tunggu render settle (2x rAF), lalu print
    setTimeout(() => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => window.print())
      );
    }, 0);

    // Fallback auto-close
    setTimeout(() => window.close(), 3000);

    onCleanup(() => window.removeEventListener("afterprint", closeAfterPrint));
  });

  return (
    <div class="p-6 print:p-0">
      {/* parsed bisa root atau {order:...}; komponen di bawah sudah handle keduanya */}
      <SalesInvoicePrint data={data()} />
    </div>
  );
}

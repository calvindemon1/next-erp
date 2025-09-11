import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

  const qtyCounterbySystem = (so, satuanUnit) => {
    let total = 0;
    let terkirim = 0;

    switch (satuanUnit) {
      case 1: // Meter
        total = parseFloat(so.summary?.total_meter || 0);
        terkirim = parseFloat(so.summary?.total_meter_dalam_proses || 0);
        break;
      case 2: // Yard
        total = parseFloat(so.summary?.total_yard || 0);
        terkirim = parseFloat(so.summary?.total_yard_dalam_proses || 0);
        break;
      case 3: // Kilogram
        total = parseFloat(so.summary?.total_kilogram || 0);
        terkirim = parseFloat(so.summary?.total_kilogram_dalam_proses || 0);
        break;
      default:
        return "-";
    }

    const sisa = total - terkirim;

    // Kalau udah habis
    if (sisa <= 0) {
      return "SELESAI";
    }

    return `${sisa.toLocaleString("id-ID")} / ${total.toLocaleString("id-ID")}`;
  };

// BARU: Fungsi kecil untuk memformat tanggal
function formatSimpleDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function PurchasingContractDropdownSearch({
  purchaseContracts,
  form,
  setForm,
  onChange,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  // const filteredContracts = createMemo(() => {
  //   const q = search().toLowerCase();
  //   return purchaseContracts().filter((p) => {
  //     const no_pc = (p.no_pc || "").toLowerCase();
  //     const supplier = (p.supplier_name || "").toLowerCase(); 
  //     return no_pc.includes(q) || supplier.includes(q);
  //   });
  // });

  const filteredContracts = createMemo(() => {
    const q = search().toLowerCase();
    return purchaseContracts()
      .filter((p) => {
        const no_pc = (p.no_pc || "").toLowerCase();
        const supplier = (p.supplier_name || "").toLowerCase();
        return no_pc.includes(q) || supplier.includes(q);
      })
      .filter((p) => {
        const satuanUnitId = p.satuan_unit_id || 1;
        return qtyCounterbySystem(p, satuanUnitId) !== "SELESAI";
      });
  });

  const selectedContract = createMemo(() =>
    purchaseContracts().find((p) => p.id == form().pc_id)
  );

  const selectContract = (contract) => {
    setForm({ ...form(), pc_id: contract.id }); 
    setIsOpen(false);
    setSearch("");
    if (onChange) onChange(contract.id);
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          disabled ? "bg-gray-200" : "bg-white"
        } cursor-default`}
        onClick={() => setIsOpen(!isOpen())}
        disabled={disabled}
      >
        <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
          {selectedContract()
            ? `${selectedContract().no_pc} - ${selectedContract().supplier_name} (${formatSimpleDate(selectedContract().created_at)})`
            : "Pilih Purchase Contract"}
        </span>
      </button>

      {isOpen() && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No. PC atau Supplier..."
            class="w-full p-2 border-b focus:outline-none sticky top-0"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredContracts().length > 0 ? (
            filteredContracts().map((p) => (
              <div
                key={p.id}
                class="p-2 hover:bg-blue-100 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                onClick={() => selectContract(p)}
              >
                {p.no_pc} - {p.supplier_name} ({formatSimpleDate(p.created_at)})
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">
              Purchase Contract tidak ditemukan
            </div>
          )}
        </div>
      )}
    </div>
  );
}
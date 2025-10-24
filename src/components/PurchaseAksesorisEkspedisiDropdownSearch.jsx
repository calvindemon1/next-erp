import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

/* === Helpers === */
function formatSimpleDate(dateString) {
  if (!dateString || dateString.length < 10) return "-";
  try {
      const formattedDate = dateString.substring(0, 10);
      const [year, month, day] = formattedDate.split('-');
      if (!year || !month || !day) return dateString;
      return `${day}-${month}-${year}`;
  } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString;
  }
}
export default function PurchaseAksesorisEkspedisiDropdownSearch(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  const list = createMemo(() => (Array.isArray(props.options) ? props.options : []));

  const filteredItems = createMemo(() => {
    const q = search().toLowerCase().trim();
    if (!q) return list();

    return list().filter((item) => {
      const noPembelian = (item.no_pembelian || "").toLowerCase();
      const noSjSupp = (item.no_sj_supplier || "").toLowerCase();
      const supplier = (item.supplier_name || "").toLowerCase();
      const tgl = formatSimpleDate(item.tanggal_sj).toLowerCase();
      const fields = [noPembelian, noSjSupp, supplier, tgl];
      return fields.some((f) => f.includes(q));
    });
  });

  const selectedItem = createMemo(() => {
    if (!props.value) return null;
    return list().find((item) => item.id === props.value) || null;
  });

  const labelOf = (item) => {
    if (!item) return "";
    const noPembelian = item.no_pembelian || "-";
    const noSjSupp = item.no_sj_supplier || "-";
    const tanggal = formatSimpleDate(item.tanggal_sj);
    const supplier = item.supplier_name || "-";
    return `${noPembelian} - ${noSjSupp} - ${tanggal} - ${supplier}`;
  };

  const handleSelect = (item) => {
    setIsOpen(false);
    setSearch("");
    if (props.onChange) {
      props.onChange(item);
    }
  };

  const placeholder = props.placeholder || "Pilih Pembelian Aksesoris/Ekspedisi";

  return (
    <div class="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left bg-transparent disabled:bg-gray-200 overflow-hidden" // Tambah overflow-hidden
        onClick={() => !props.disabled && setIsOpen(!isOpen())}
        disabled={props.disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen()}
      >
        {/* Tambahkan span dengan class elipsis */}
        <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
          {selectedItem() ? labelOf(selectedItem()) : placeholder}
        </span>
      </button>

      {isOpen() && !props.disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow-lg max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No Beli / No SJ / Supplier / Tgl SJ..."
            class="w-full p-2 border-b sticky top-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            autofocus
          />
          {filteredItems().length > 0 ? (
            filteredItems().map((item) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => handleSelect(item)}
                title={labelOf(item)}
              >
                <div class="whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                  {labelOf(item)}
                </div>
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Data tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}
import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

// 1. Terima prop 'disabled' di sini, dengan nilai default 'false'
export default function SalesOrderDropdownSearch({
  salesOrders,
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
    const cleanup = onClickOutside(dropdownRef, () => {
      setIsOpen(false);
    });
    onCleanup(cleanup);
  });

  const filteredSalesContracts = createMemo(() => {
    const q = search().toLowerCase();
    return salesOrders().filter((c) => {
      const no_so = c.no_so?.toLowerCase() || "";
      return no_so.includes(q);
    });
  });

  const selectedSalesOrder = createMemo(() =>
    salesOrders().find((c) => c.id == form().sales_order_id)
  );

  const selectSalesOrder = (so) => {
    // Jangan lakukan apa-apa jika disabled
    if (disabled) return;
    
    setForm({ ...form(), sales_order_id: so.id });
    setIsOpen(false);
    setSearch("");

    if (onChange) onChange(so);
  };

  const handleToggleDropdown = () => {
    // Hanya buka dropdown jika tidak disabled
    if (!disabled) {
      setIsOpen(!isOpen());
    }
  };

  return (
    <div class="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        // 3. Tambahkan class untuk styling saat disabled
        class="w-full border p-2 rounded text-left disabled:bg-gray-200"
        onClick={handleToggleDropdown}
        // 2. Gunakan prop 'disabled' untuk menonaktifkan tombol
        disabled={disabled}
      >
        {selectedSalesOrder() ? selectedSalesOrder().no_so : "Pilih SO"}
      </button>

      {/* Tambahkan pengecekan !disabled di sini agar dropdown tidak muncul sama sekali */}
      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari customer..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredSalesContracts().length > 0 ? (
            filteredSalesContracts().map((so) => (
              <div
                key={so.id}
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => selectSalesOrder(so)}
              >
                {so.no_so}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Sales Order tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}
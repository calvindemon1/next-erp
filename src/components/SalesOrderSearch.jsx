import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside.jsx";

function formatSimpleDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

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
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  const filteredSalesOrders = createMemo(() => {
    const q = search().toLowerCase();
    return salesOrders().filter((so) => {
      const no_so = (so.no_so || "").toLowerCase();
      const customer = (so.customer_name || "").toLowerCase();
      return no_so.includes(q) || customer.includes(q);
    });
  });

  const selectedSalesOrder = createMemo(() =>
    salesOrders().find((c) => c.id == form().sales_order_id)
  );

  const selectSalesOrder = (so) => {
    if (disabled) return;
    setForm({ ...form(), sales_order_id: so.id });
    setIsOpen(false);
    setSearch("");
    if (onChange) onChange(so);
  };

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen());
    }
  };

  return (
    <div class="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left disabled:bg-gray-200"
        onClick={handleToggleDropdown}
        disabled={disabled}
      >
        <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
          {selectedSalesOrder()
            ? `${selectedSalesOrder().no_so} - ${selectedSalesOrder().customer_name} (${formatSimpleDate(selectedSalesOrder().created_at)})`
            : "Pilih SO"}
        </span>
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No. SO atau Customer..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredSalesOrders().length > 0 ? (
            filteredSalesOrders().map((so) => (
              <div
                key={so.id}
                class="p-2 hover:bg-blue-100 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                onClick={() => selectSalesOrder(so)}
              >
                {so.no_so} - {so.customer_name} ({formatSimpleDate(so.created_at)})
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
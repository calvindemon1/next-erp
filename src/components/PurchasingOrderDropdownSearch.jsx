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

export default function PurchasingOrderDropdownSearch(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    onClickOutside(dropdownRef, () => setIsOpen(false));
  });

  const filteredItems = createMemo(() => {
    const query = search().toLowerCase();
    if (!Array.isArray(props.items)) return [];
    return props.items.filter((item) => {
      const no_po = (item.no_po || "").toLowerCase();
      const supplier = (item.supplier_name || "").toLowerCase();
      return no_po.includes(query) || supplier.includes(query);
    });
  });

  const selectedItem = createMemo(() => {
    if (!Array.isArray(props.items)) return null;
    return props.items.find((item) => item.id === props.value);
  });

  const handleSelect = (item) => {
    setIsOpen(false);
    setSearch("");
    if (props.onChange) {
      props.onChange(item);
    }
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left bg-transparent disabled:bg-gray-200"
        onClick={() => setIsOpen(!isOpen())}
        disabled={props.disabled}
      >
        <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
          {selectedItem()
            ? `${selectedItem().no_po} - ${selectedItem().supplier_name} (${formatSimpleDate(selectedItem().created_at)})`
            : "Pilih Purchase Order"}
        </span>
      </button>

      {isOpen() && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow-lg max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No. PO atau Supplier..."
            class="w-full p-2 border-b sticky top-0"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredItems().length > 0 ? (
            filteredItems().map((item) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                onClick={() => handleSelect(item)}
              >
                {item.no_po} - {item.supplier_name} ({formatSimpleDate(item.created_at)})
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">
              Purchase Order tidak ditemukan
            </div>
          )}
        </div>
      )}
    </div>
  );
}
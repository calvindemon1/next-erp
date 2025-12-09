import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function OCXDropdownSearch({
  items = [],
  value = null,
  onChange,
  disabled = false,
  form,
  setForm,
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  const filteredItems = createMemo(() => {
    const q = search().toLowerCase();
    console.log("Searching items:", items.length, "with query:", q);
    
    if (!q) return items;
    
    return items.filter((item) => {
      const noPoEx = (item.no_po_ex || "").toLowerCase();
      const supplier = (item.nama_supplier || "").toLowerCase();
      return noPoEx.includes(q) || supplier.includes(q);
    });
  });

  const selectedItem = createMemo(() => {
    console.log("Looking for selected item with value:", value, "in items:", items);
    return items.find((item) => item.id == value);
  });

  const selectItem = (item) => {
    console.log("Selected item:", item);
    if (onChange) {
      onChange(item);
    } else if (setForm) {
      setForm({ ...form(), purchase_order_id: item.id });
    }
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          disabled ? "bg-gray-200 cursor-default" : "bg-white"
        }`}
        onClick={() => {
          console.log("Dropdown clicked, disabled:", disabled, "isOpen:", isOpen());
          if (!disabled) {
            setIsOpen(!isOpen());
          }
        }}
        disabled={disabled}
      >
        <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
          {selectedItem()
            ? `${selectedItem().no_po_ex} - ${selectedItem().nama_supplier}`
            : "Pilih OCX"}
        </span>
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No. OCX atau Supplier..."
            class="w-full p-2 border-b focus:outline-none sticky top-0"
            value={search()}
            onInput={(e) => {
              console.log("Search input:", e.target.value);
              setSearch(e.target.value);
            }}
            autofocus
          />
          {filteredItems().length > 0 ? (
            <div>
              <div class="text-xs text-gray-500 px-2 py-1">
                Menampilkan {filteredItems().length} dari {items.length} OCX
              </div>
              {filteredItems().map((item) => (
                <div
                  key={item.id}
                  class="p-2 hover:bg-blue-100 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis border-b"
                  onClick={() => {
                    console.log("Item clicked:", item);
                    selectItem(item);
                  }}
                >
                  {item.no_po_ex} - {item.nama_supplier}
                </div>
              ))}
            </div>
          ) : (
            <div class="p-2 text-gray-400">
              {search() ? "Tidak ditemukan" : "Tidak ada OCX tersedia"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
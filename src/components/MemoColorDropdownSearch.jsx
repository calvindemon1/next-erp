import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function MemoColorDropdownSearch(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  // close when click outside
  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  // filter colors
  const filteredColors = createMemo(() => {
    const q = search().toLowerCase();
    return props.colors().filter((c) => {
      return (
        (c.kode ?? "").toLowerCase().includes(q) ||
        (c.deskripsi ?? "").toLowerCase().includes(q)
      );
    });
  });

  // selected color (source of truth: props.value)
  const selectedColor = createMemo(() => {
    const id = props.value();
    if (!id) return null;
    return props.colors().find((c) => c.id === id) ?? null;
  });

  const handleSelect = (color) => {
    props.onChange(color.id); // update parent
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div class="relative w-full" ref={dropdownRef}>
      {/* hidden input */}
      <input type="hidden" name="warna_id" value={props.value() ?? ""} />

      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          props.disabled ? "bg-gray-200" : "bg-transparent"
        }`}
        disabled={props.disabled}
        onClick={() => !props.disabled && setIsOpen((v) => !v)}
      >
        {selectedColor()
          ? `${selectedColor().kode} | ${selectedColor().deskripsi}`
          : "Pilih Warna"}
      </button>

      {isOpen() && !props.disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari warna..."
            class="w-full p-2 border-b focus:outline-none"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />

          {filteredColors().length > 0 ? (
            filteredColors().map((c) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => handleSelect(c)}
              >
                {c.kode} | {c.deskripsi}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Warna tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}

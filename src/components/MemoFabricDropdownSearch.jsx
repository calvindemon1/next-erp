import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function MemoFabricDropdownSearch(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  // close on outside click
  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  // filter fabrics
  const filteredFabrics = createMemo(() => {
    const q = search().toLowerCase();
    return props.fabrics().filter((f) => {
      return (
        (f.corak ?? "").toLowerCase().includes(q) ||
        (f.konstruksi ?? "").toLowerCase().includes(q)
      );
    });
  });

  // selected fabric (SOURCE OF TRUTH: props.value)
  const selectedFabric = createMemo(() => {
    const id = props.value();
    if (!id) return null;
    return props.fabrics().find((f) => f.id === id) ?? null;
  });

  const handleSelect = (fabric) => {
    props.onChange(fabric.id); // update parent
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div class="relative" ref={dropdownRef}>
      {/* hidden input for form submit */}
      <input type="hidden" name="kain_id" value={props.value() ?? ""} />

      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          props.disabled ? "bg-gray-200" : "bg-transparent"
        }`}
        disabled={props.disabled}
        onClick={() => !props.disabled && setIsOpen((v) => !v)}
      >
        {selectedFabric()
          ? `${selectedFabric().corak} | ${selectedFabric().konstruksi}`
          : "Pilih Jenis Kain"}
      </button>

      {isOpen() && !props.disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari jenis / konstruksi kain..."
            class="w-full p-2 border-b focus:outline-none"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />

          {filteredFabrics().length > 0 ? (
            filteredFabrics().map((f) => (
              <div
                class="p-2 cursor-pointer hover:bg-blue-100"
                onClick={() => handleSelect(f)}
              >
                {f.corak} | {f.konstruksi}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Jenis kain tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}

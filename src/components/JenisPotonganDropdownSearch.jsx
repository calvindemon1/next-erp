import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside.jsx";

export default function JenisPotonganDropdownSearch({
  options,
  jenisPotongans,
  form,
  setForm,
  onChange,
  disabled = false,
  valueKey = "jenis_potongan_id",
  placeholder = "Pilih Jenis Potongan",
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  const list = createMemo(() => {
    if (typeof options === "function") {
      const maybe = options();
      return Array.isArray(maybe) ? maybe : [];
    }
    if (Array.isArray(options)) return options;

    if (typeof jenisPotongans === "function") {
      const maybe = jenisPotongans();
      return Array.isArray(maybe) ? maybe : [];
    }
    if (Array.isArray(jenisPotongans)) return jenisPotongans;

    return [];
  });

  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    if (!q) return list();
    return list().filter((j) => {
      const name = (j.name || "").toLowerCase();
      const kode = (j.kode || "").toLowerCase();
      return name.includes(q) || kode.includes(q);
    });
  });

  const selected = createMemo(() =>
    list().find((j) => String(j.id) === String(form()?.[valueKey]))
  );

  const setFormSafe = (key, val) => {
    try {
      setForm((prev) => ({ ...(prev || {}), [key]: val }));
      return;
    } catch (err) {
      // fallback to object-set
    }
    try {
      const f = typeof form === "function" ? form() : form;
      setForm({ ...(f || {}), [key]: val });
    } catch (err) {
      console.error("JenisPotonganDropdownSearch: failed to set form", err);
    }
  };

  const selectItem = (item) => {
    if (disabled) return;
    setFormSafe(valueKey, item.id);
    setIsOpen(false);
    setSearch("");
    onChange && onChange(item);
  };

  return (
    <div class="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left disabled:bg-gray-200"
        onClick={() => !disabled && setIsOpen(!isOpen())}
        disabled={disabled}
      >
        <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
          {selected() ? selected().name : placeholder}
        </span>
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder={`Cari ${placeholder.toLowerCase()}…`}
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            autofocus
          />

          {filtered().length > 0 ? (
            filtered().map((j) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                onClick={() => selectItem(j)}
              >
                {j.name}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">{placeholder} tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}
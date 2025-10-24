import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside.jsx";

export default function JenisHutangDropdownSearch({
  jenisHutangs,
  form,
  setForm,
  onChange,
  disabled = false,
  valueKey = "jenis_hutang_id",
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  // close when clicking outside
  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  // filter by name
  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    if (!q) return jenisHutangs();
    return jenisHutangs().filter((j) => {
      const name = (j.name || "").toLowerCase();
      return name.includes(q);
    });
  });

  const selected = createMemo(() =>
    jenisHutangs().find((j) => String(j.id) === String(form()?.[valueKey]))
  );

  const selectItem = (item) => {
    if (disabled) return;
    setForm({ ...form(), [valueKey]: item.id });
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
          {selected() ? selected().name : "Pilih Jenis Hutang"}
        </span>
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari jenis hutang…"
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
            <div class="p-2 text-gray-400">Jenis hutang tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}

import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside.jsx";

export default function BankAccountDropDownSearch({
  bankAccounts,
  form,
  setForm,
  onChange,
  disabled = false,
  valueKey = "bank_account_id",
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

  // filter by name or number
  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    if (!q) return bankAccounts();
    return bankAccounts().filter((b) => {
      const name = (b.bank_account_name || "").toLowerCase();
      const no   = (b.bank_account_number || "").toLowerCase();
      return name.includes(q) || no.includes(q);
    });
  });

  const selected = createMemo(() =>
    bankAccounts().find((b) => String(b.id) === String(form()?.[valueKey]))
  );

  const selectItem = (acc) => {
    if (disabled) return;
    setForm({ ...form(), [valueKey]: acc.id });
    setIsOpen(false);
    setSearch("");
    onChange && onChange(acc);
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
          {selected()
            ? `${selected().bank_account_name} — ${selected().bank_account_number}`
            : "Pilih Bank Account"}
        </span>
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari nama / nomor bank…"
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            autofocus
          />

          {filtered().length > 0 ? (
            filtered().map((acc) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                onClick={() => selectItem(acc)}
              >
                {acc.bank_account_name} — {acc.bank_account_number}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Bank Account tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}

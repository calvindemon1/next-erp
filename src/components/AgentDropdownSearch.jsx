import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside.jsx";

export default function AgentDropdownSearch({
  agents,           // prefer this
  agentList,        // or this (fallback)
  form,
  setForm,
  onChange,
  disabled = false,
  valueKey = "agent_id",
  classList = {}
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  // source data: support agents() or agentList()
  const source = () => {
    const fn = agents || agentList;   // whichever is passed
    return typeof fn === "function" ? fn() : (fn || []);
  };

  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    const rows = source() || [];
    if (!q) return rows;
    return rows.filter(a => {
      const name = (a.agent_name || "").toLowerCase();
      const idStr = String(a.id || "").toLowerCase();
      return name.includes(q) || idStr.includes(q);
    });
  });

  const selected = createMemo(() => {
    const rows = source() || [];
    return rows.find(a => String(a.id) === String(form()?.[valueKey]));
  });

  const selectItem = (a) => {
    if (disabled) return;
    setForm({ ...form(), [valueKey]: a.id });
    setIsOpen(false);
    setSearch("");
    onChange && onChange(a);
  };

  return (
    <div class="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${classList["bg-gray-200"] ? "bg-gray-200" : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen())}
        disabled={disabled}
      >
        <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
          {selected() ? `${selected().agent_name}` : "Pilih Agent"}
        </span>
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari nama / ID…"
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            autofocus
          />
          {filtered().length > 0 ? (
            filtered().map((a) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                onClick={() => selectItem(a)}
              >
                {a.agent_name} — ID: {a.id}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Agent tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}

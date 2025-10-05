import { createSignal, createMemo, createEffect } from "solid-js";
import { onClickOutside } from "./OnClickOutside.jsx";

/* === Helpers === */
function lotsOf(sj) {
  const items = Array.isArray(sj?.items) ? sj.items : [];
  const lots = [
    ...new Set(
      items
        .map((it) => it?.lot ?? it?.no_lot ?? it?.lot_no)
        .filter(Boolean)
        .map(String)
    ),
  ];
  if (lots.length === 0) return "-";
  return lots.length <= 3 ? lots.join(", ") : `${lots.slice(0, 3).join(", ")} +${lots.length - 3}`;
}

function formatSimpleDate(dateString) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}
/* === End Helpers === */

export default function SuratPenerimaanDropdownSearch(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  const showLots = () => Boolean(props.showLots);

  createEffect(() => {
    if (!dropdownRef) return;
    onClickOutside(dropdownRef, () => setIsOpen(false));
  });

  const filteredItems = createMemo(() => {
    const q = search().toLowerCase();
    const list = Array.isArray(props.items) ? props.items : [];
    const excludeReturned = props.excludeReturned ?? false;
    const excludeZeroAvailable = props.excludeZeroAvailable ?? false;

    return list
      // hide returned if requested
      .filter((sj) => (excludeReturned ? !sj?.returned_at : true))
      // hide when available 0 if requested (requires __available_total__)
      .filter((sj) =>
        excludeZeroAvailable ? (sj?.__available_total__ ?? Infinity) > 0 : true
      )
      .filter((sj) => {
        const noSj = (sj.no_sj || "").toLowerCase();
        const noSupp = (sj.no_sj_supplier || "").toLowerCase();
        const supplier = (sj.supplier_name || "").toLowerCase();
        const tgl = formatSimpleDate(sj.tanggal_kirim || sj.created_at).toLowerCase();
        const fields = [noSj, noSupp, supplier, tgl];

        if (showLots()) {
          const lotTxt = lotsOf(sj).toLowerCase();
          fields.push(lotTxt);
        }

        return fields.some((f) => f.includes(q));
      });
  });

  const selectedItem = createMemo(() => {
    if (!Array.isArray(props.items)) return null;
    return props.items.find((sj) => sj.id === props.value) || null;
  });

  const labelOf = (sj) => {
    const noSurat = sj?.no_sj || "-";
    const noSjSupp = sj?.no_sj_supplier || "-";
    const supplier = sj?.supplier_name || "-";
    const tanggal = formatSimpleDate(sj?.tanggal_kirim || sj?.created_at);
    if (showLots()) {
      const lots = lotsOf(sj);
      return `${noSurat} - ${noSjSupp} - ${lots} - ${supplier} (${tanggal})`;
    }
    return `${noSurat} - ${noSjSupp} - ${supplier} (${tanggal})`;
  };

  const handleSelect = (sj) => {
    setIsOpen(false);
    setSearch("");
    props.onChange?.(sj);
  };

  const phBase = props.placeholder || "Pilih Surat Penerimaan";
  const placeholder = showLots() ? `${phBase}` : `${phBase}`;

  return (
    <div class="relative" ref={dropdownRef}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left bg-transparent disabled:bg-gray-200"
        onClick={() => setIsOpen(!isOpen())}
        disabled={props.disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen()}
      >
        <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
          {selectedItem() ? labelOf(selectedItem()) : placeholder}
        </span>
      </button>

      {isOpen() && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow-lg max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder={
              showLots()
                ? "Cari No. SJ / No. SJ Supplier / Lot / Supplier / Tanggal…"
                : "Cari No. SJ / No. SJ Supplier / Supplier / Tanggal…"
            }
            class="w-full p-2 border-b sticky top-0"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            autofocus
          />
          {filteredItems().length > 0 ? (
            filteredItems().map((sj) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => handleSelect(sj)}
              >
                <div class="whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                  {labelOf(sj)}
                </div>
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Surat Penerimaan tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}

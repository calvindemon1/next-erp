import { createSignal, For, onMount, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  createPackingList,
  getPackingLists,
  getAllFabrics,
  getAllColors,
  getAllCustomers,
  updateDataPackingList,
  getUser,
  getAllSalesOrders,
  getLastSequence,
  getSalesOrders,
} from "../../utils/auth";
import SearchableSalesOrderSelect from "../../components/SalesOrderSearch";
import ColorDropdownSearch from "../../components/ColorDropdownSearch";
import { Printer, Trash2, XCircle } from "lucide-solid";

// (2) Component Start
export default function PackingListForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === 'true';
  const navigate = useNavigate();
  const user = getUser();

  const [salesOrderList, setSalesOrderList] = createSignal([]);
  const [openStates, setOpenStates] = createSignal([]);
  const [groupRollCounts, setGroupRollCounts] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [colDraft, setColDraft] = createSignal({}); // key per group
  const colKey = (gIdx) => `g-${gIdx}`;
  const [soColors, setSoColors] = createSignal([]);

  const [form, setForm] = createSignal({
    type: "",
    no_pl: "",
    sequence_number: "",
    sales_order_id: "",
    col: "",
    keterangan: "",
    itemGroups: [],
    sales_order_items: [],
    satuan_unit: "",
  });

  // ===== Helpers untuk qty =====
  const numVal = (v) => Number(v || 0);
  const hasQty = (r) => numVal(r.meter) > 0 || numVal(r.yard) > 0;

  // (3) onMount untuk edit atau new
  onMount(async () => {
    setLoading(true);
    const salesOrders = await getAllSalesOrders(user?.token);
    setSalesOrderList(salesOrders?.orders || []);

    if (isEdit) {
      const res = await getPackingLists(params.id, user?.token);
      const packingList = res?.order;

      //console.log("Data PL: ", JSON.stringify(packingList, null, 2));

      if (!packingList) return;

      const ROWS_PER = packingList?.type === "ekspor" ? 10 : 5;

      await handleSalesOrderChange(packingList.so_id);

      setForm((prev) => ({
        ...prev,
        sales_order_id: packingList.so_id,
        no_pl: packingList.no_pl,
        sequence_number: packingList.sequence_number,
        type:
          packingList.type === "domestik"
            ? 1
            : packingList.type === "ekspor"
            ? 2
            : "",
        keterangan: packingList.keterangan || "",
        itemGroups: (packingList.items || []).map((group) => {
          const rolls = (group.rolls || []).map((r, idx) => ({
            roll_id: r.id,
            row_num: Math.floor(idx / ROWS_PER) + 1,
            col_num: (idx % ROWS_PER) + 1,
            col: r.col || group.col || "",
            item: r.so_item_id || group.so_item_id || "",
            meter: r.meter || "",
            yard: r.yard || ((r.meter || 0) * 1.093613).toFixed(2),
            kilogram: r.kilogram || null,
            // Field Bal & Lot
            lot: r.lot ?? "",
            no_bal: r.no_bal ?? "",
          }));

          return {
            id: group.id, 
            item: group.so_item_id || [],
            col: group.col || "",
            meter_total: group.meter_total || 0,
            yard_total: group.yard_total || 0,
            kilogram_total: group.kilogram_total || null,
            rolls,
          };
        }),
      }));
    }
    setLoading(false);
  });

  // ==== SEGMEN FORMAT ====
  const formatNumber = (num, decimals = 2) => {
    if (num === "" || num === null || num === undefined) return "";

    const numValue = Number(num);
    if (isNaN(numValue)) return "";
    if (numValue === 0) return "0";

    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numValue);
  };

  // Fungsi untuk mengubah string format kembali menjadi angka
  const parseNumber = (str) => {
    if (typeof str !== 'string' || !str) return 0;
    const cleaned = str.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const formatNumberQty = (num, decimals = 2) => {
    const n = Number(num ?? 0);
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(isNaN(n) ? 0 : n);
  };

  const formatRollCellValue = (v) => {
    if (v === "" || v === null || v === undefined) return "";
    const n = Number(v);
    return n === 0 ? "" : formatNumber(n);
  };

  // =================================

  // Normalisasi tipe & fallback dari nomor SO
  const isEkspor = () => {
    const t = form()?.type;

    // normalisasi jadi huruf besar string
    const s = (t === undefined || t === null) ? "" : String(t).trim().toUpperCase();

    // true untuk 2 (angka/string), 'E', 'EKSPOR'
    if (s === "2" || s === "E" || s === "EKSPOR") return true;
    if (s === "1" || s === "D" || s === "DOMESTIK") return false;

    // fallback terakhir: baca dari No SO (format: .../E/... atau .../D/...)
    const noSO = form()?.sales_order_items?.no_so || "";
    const kodeSO = (noSO.split("/")[1] || "").toUpperCase();
    return kodeSO === "E";
  };

  // Kolom per baris mengikuti ekspor/domestik
  const MAX_COL_PER_ROW = () => (isEkspor() ? 10 : 5);

  // (4) Saat Sales Order berubah
  const handleSalesOrderChange = async (selectedSO) => {
    if (!selectedSO) return;

    let selectedOrder;

    if (isEdit) {
      const res = await getSalesOrders(selectedSO, user?.token); // selectedSO = so_id (number)
      selectedOrder = res?.order;

      setForm({
        ...form(),
        sales_order_items: selectedOrder,
        satuan_unit: selectedOrder?.satuan_unit || "",
      });
    } else {
      const res = await getSalesOrders(selectedSO.id, user?.token); // selectedSO = object SO
      selectedOrder = res?.order;

      const soTypeLetter = (selectedSO.no_so || "").split("/")[1];
      const typeValue = soTypeLetter === "E" ? "E" : soTypeLetter === "D" ? "D" : "";
      const soPpn = (selectedSO.no_so || "").split("/")[2];
      const ppnValue = soPpn === "P" ? 1 : 0;

      const generatedNoPL = await generatePackingListNumber(typeValue, ppnValue);

      setForm({
        ...form(),
        sales_order_id: selectedSO.id,
        type: typeValue,
        no_pl: generatedNoPL,
        sales_order_items: selectedOrder,
        satuan_unit: selectedOrder?.satuan_unit || "",
      });
    }

    // === build daftar warna dari selectedOrder ===
    const items = selectedOrder?.items || [];
    const colorMap = new Map();

    items.forEach((it) => {
      const id =
        it.warna_id ?? it.color_id ?? it.warna?.id ?? it.col_id ?? it.col ?? null;
      const kode =
        it.kode_warna ?? it.warna_kode ?? it.warna?.kode ?? it.col_kode ?? it.col ?? "";
      const deskripsi =
        it.deskripsi_warna ??
        it.warna_deskripsi ??
        it.warna?.deskripsi ??
        it.color_desc ??
        it.warna_kain ??
        "";

      if (id != null) {
        colorMap.set(String(id), {
          id,
          kode: String(kode || ""),
          deskripsi: String(deskripsi || ""),
        });
      }
    });

    setSoColors(Array.from(colorMap.values()));
  };

  const generatePackingListNumber = async (type, ppn) => {
    const salesType = type === "D" ? "domestik" : type === "E" ? "ekspor" : "";
    const ppnType = ppn === 1 ? "P" : "N";
    const lastSeq = await getLastSequence(user?.token, "pl", salesType, ppn);

    const now = new Date();
    const mmyy = `${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getFullYear()
    ).slice(-2)}`;
    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");

    setForm({
      ...form(),
      sequence_number: (lastSeq?.last_sequence || 0) + 1,
    });

    return `PL/${type}/${ppnType}/${mmyy}-${nextNum}`;
  };

  const addItemGroup = () => {
    setForm((prev) => ({
      ...prev,
      itemGroups: [
        ...prev.itemGroups,
        {
          sales_order_item_id: "",
          col: "", // col untuk group
          meter_total: 0,
          yard_total: 0,
          kilogram_total: null,
          rolls: [  
            {
              row_num: 1,
              col_num: 1,
              col: "",
              item: "",
              meter: "",
              yard: "",
              kilogram: null,
              lot: null,
              no_bal: null,
            },
          ],
        },
      ],
    }));
    setOpenStates((prev) => [...prev, false]);
    setGroupRollCounts((prev) => [...prev, null]);
  };

  const removeItemGroup = (index) => {
    setForm((prev) => {
      const updated = [...prev.itemGroups];
      updated.splice(index, 1);
      return { ...prev, itemGroups: updated };
    });
    setOpenStates((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    setGroupRollCounts((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const reindexRolls = (rolls) => {
    return rolls.map((roll, index) => {
      const meterValue = parseFloat(roll.meter || 0);
      return {
        ...roll,
        row_num: Math.floor(index / MAX_COL_PER_ROW()) + 1,
        col_num: (index % MAX_COL_PER_ROW()) + 1,
        yard: (meterValue * 1.093613).toFixed(2),
        kilogram: roll.kilogram || null,
      };
    });
  };

  const addRoll = (groupIndex) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      const rolls = [
        ...copy[groupIndex].rolls,
        { meter: "", yard: "", kilogram: null },
      ];
      copy[groupIndex].rolls = reindexRolls(rolls);
      copy[groupIndex].meter_total = rolls.reduce(
        (sum, r) => sum + (hasQty(r) ? Number(r.meter) : 0),
        0
      );
      copy[groupIndex].yard_total = rolls.reduce(
        (sum, r) => sum + (hasQty(r) ? Number(r.yard) : 0), 0
      );
      return { ...prev, itemGroups: copy };
    });
  };

  const addMultipleRolls = (groupIndex, count) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      const group = copy[groupIndex];

      const lastRoll = group.rolls[group.rolls.length - 1] || {
        col: "",
        item: "",
        meter: "",
        yard: "",
      };

      const newRolls = Array.from({ length: count }, () => ({
        col: lastRoll.col || "",
        item: lastRoll.item || "",
        meter: lastRoll.meter || "",
        yard: lastRoll.yard || "",
        lot: lastRoll.lot ?? null,
        no_bal: lastRoll.no_bal ?? null,
      }));

      copy[groupIndex] = {
        ...group,
        rolls: [...group.rolls, ...newRolls],
      };

      return { ...prev, itemGroups: copy };
    });
  };

  const removeRoll = (groupIndex, rollIndex) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      const group = copy[groupIndex];

      if (!group || !Array.isArray(group.rolls)) return prev;

      const updatedRolls = [...group.rolls];
      updatedRolls.splice(rollIndex, 1);

      // hitung ulang total hanya dari roll yang punya qty
      const meter_total = updatedRolls.reduce((sum, r) => sum + (hasQty(r) ? Number(r.meter || 0) : 0), 0);
      const yard_total  = updatedRolls.reduce((s, r) => s + (hasQty(r) ? Number(r.yard  || 0) : 0), 0);

      copy[groupIndex] = { ...group, rolls: updatedRolls, meter_total, yard_total };

      return { ...prev, itemGroups: copy };
    });
  };

  const handleRollChange = (groupIndex, rollIndex, field, value) => {
    setForm((prev) => {
      const newGroups = [...prev.itemGroups];
      const targetGroup = { ...newGroups[groupIndex] };
      let newRolls = [...targetGroup.rolls];
      const updatedRoll = { ...newRolls[rollIndex] };

      if (field === "meter" || field === "yard") {
        const numericValue = parseNumber(value);

        // kalau <= 0 → treat sebagai kosong (tidak dihitung PCS)
        if (!numericValue || numericValue <= 0) {
          updatedRoll.meter = "";
          updatedRoll.yard  = "";
        } else {
          if (form().satuan_unit === "Yard") {
            updatedRoll.yard  = numericValue;
            updatedRoll.meter = numericValue * 0.9144;
          } else {
            updatedRoll.meter = numericValue;
            updatedRoll.yard  = numericValue * 1.093613;
          }
        }
        newRolls[rollIndex] = updatedRoll;

      } else if (field === "no_bal") {
        // propagasi ke seluruh roll di baris yang sama
        const rowNum = updatedRoll.row_num ?? Math.floor(rollIndex / MAX_COL_PER_ROW()) + 1;
        const v = value === "" ? null : Number(value);
        newRolls = newRolls.map((r, idx) => {
          const rn = r.row_num ?? Math.floor(idx / MAX_COL_PER_ROW()) + 1;
          return rn === rowNum ? { ...r, no_bal: v } : r;
        });
      } else if (field === "lot") {
        // LOT berlaku untuk seluruh roll dalam baris yang sama
        const rowNum = updatedRoll.row_num ?? Math.floor(rollIndex / MAX_COL_PER_ROW()) + 1;
        const v = value === "" ? null : Number(value);
        newRolls = newRolls.map((r, idx) => {
          const rn = r.row_num ?? Math.floor(idx / MAX_COL_PER_ROW()) + 1;
          return rn === rowNum ? { ...r, lot: v } : r;
        });
      } else {
        updatedRoll[field] = value;
        newRolls[rollIndex] = updatedRoll;
      }

      // hitung subtotal hanya dari roll yang punya qty
      targetGroup.meter_total = newRolls.reduce((sum, r) => sum + (hasQty(r) ? Number(r.meter || 0) : 0), 0);
      targetGroup.yard_total  = newRolls.reduce((s, r) => s + (hasQty(r) ? Number(r.yard  || 0) : 0), 0);

      targetGroup.rolls = newRolls;
      newGroups[groupIndex] = targetGroup;
      return { ...prev, itemGroups: newGroups };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        const payload = {
          no_pl: form().no_pl,
          so_id: Number(form().sales_order_id),
          keterangan: form().keterangan,
          items: form().itemGroups.map((g) => {
            // buang roll tanpa qty
            const filtered = g.rolls.filter(hasQty);
            const rollsWithIndex = filtered.map((r, idx) => {
              const row_num = Math.floor(idx / MAX_COL_PER_ROW()) + 1;
              const col_num = (idx % MAX_COL_PER_ROW()) + 1;

              const roll = {
                row_num,
                col_num,
                meter: Number(r.meter) || 0,
                yard: parseFloat(r.yard) || (Number(r.meter) || 0) * 1.093613,
                kilogram: r.kilogram ? Number(r.kilogram) : null,
                // Field Bal & Lot
                lot: r.lot !== undefined && r.lot !== "" ? Number(r.lot) : null,
                no_bal: r.no_bal !== undefined && r.no_bal !== "" ? Number(r.no_bal) : null,
              };

              if (r.roll_id) {
                roll.id = r.roll_id; // <-- pakai ID DB
              }
              return roll;
            });

            const meter_total = rollsWithIndex.reduce((sum, r) => sum + r.meter, 0);
            const yard_total = rollsWithIndex.reduce((sum, r) => sum + r.yard, 0);
            const kilogram_total =
              rollsWithIndex.reduce((sum, r) => sum + (r.kilogram || 0), 0) || null;

            return {
              id: g.id,
              so_item_id: Number(g.item || filtered[0]?.item || 0),
              col: Number(g.col || filtered[0]?.col || 0),
              meter_total,
              yard_total,
              kilogram_total,
              rolls: rollsWithIndex,
            };
          }),
        };
        await updateDataPackingList(user?.token, params.id, payload);
      } else {
        const payload = {
          type:
            form().type === "D"
              ? "domestik"
              : form().type === "E"
              ? "ekspor"
              : "",
          sequence_number: form().sequence_number || null,
          so_id: Number(form().sales_order_id),
          keterangan: form().keterangan,
          items: form().itemGroups.map((g) => {
            // buang roll tanpa qty
            const filtered = g.rolls.filter(hasQty);
            const rollsWithIndex = filtered.map((r, idx) => {
              const row_num = Math.floor(idx / MAX_COL_PER_ROW()) + 1;
              const col_num = (idx % MAX_COL_PER_ROW()) + 1;

              return {
                row_num,
                col_num,
                meter: Number(r.meter) || 0,
                yard: parseFloat(r.yard) || (Number(r.meter) || 0) * 1.093613,
                kilogram: r.kilogram ? Number(r.kilogram) : null,
                // Field Bal & Lot
                lot: r.lot !== undefined && r.lot !== "" ? Number(r.lot) : null,
                no_bal: r.no_bal !== undefined && r.no_bal !== "" ? Number(r.no_bal) : null,
              };
            });

            const meter_total = rollsWithIndex.reduce((sum, r) => sum + r.meter, 0);
            const yard_total = rollsWithIndex.reduce((sum, r) => sum + r.yard, 0);
            const kilogram_total =
              rollsWithIndex.reduce((sum, r) => sum + (r.kilogram || 0), 0) || null;

            return {
              so_item_id: Number(g.item || filtered[0]?.item || 0),
              col: Number(g.col || filtered[0]?.col || 0),
              meter_total,
              yard_total,
              kilogram_total,
              rolls: rollsWithIndex,
            };
          }),
        };
        //console.log("Create PL: ", JSON.stringify(payload, null, 2));
        await createPackingList(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil Update" : "Berhasil Simpan",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/packinglist");
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error?.message || "Terjadi kesalahan saat menyimpan.",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  const chunkArrayWithIndex = (arr, size) => {
    return arr
      .map((roll, index) => ({ roll, index }))
      .reduce((chunks, current, idx) => {
        const chunkIndex = Math.floor(idx / size);
        if (!chunks[chunkIndex]) chunks[chunkIndex] = [];
        chunks[chunkIndex].push(current);
        return chunks;
      }, []);
  };

  function handlePrint() {
    localStorage.setItem("printData", JSON.stringify(form()));
    window.open("/print/packinglist", "_blank");
  }

  // ====== KOLOM DINAMIS: colgroup + table-fixed (UPDATED) ======
  const ROLL_COL_PX = () => (isEkspor() ? 66 : 68);   // kolom 1..N
  const BAL_PCT     = () => (isEkspor() ? "8%" : "9%");
  const COL_PCT     = () => (isEkspor() ? "11%" : "12%");
  const ITEM_PCT    = "15%";                           // tetap
  const LOT_PCT     = () => (isEkspor() ? "8%" : "9%");
  const PCS_PX      = () => (isEkspor() ? 80 : 56);    // TTL/PCS lebih lebar saat ekspor
  const TOTAL_PX    = () => (isEkspor() ? 120 : 96);   // TTL/MTR & TTL/YARD lebih lebar saat ekspor

  const renderColGroup = () => {
    const widths = [
      "3%",                 // No
      BAL_PCT(),            // Bal (diperkecil saat ekspor)
      COL_PCT(),            // Col (diperkecil saat ekspor)
      ITEM_PCT,             // Item
      LOT_PCT(),
      ...Array.from({ length: MAX_COL_PER_ROW() }, () => `${ROLL_COL_PX()}px`),
      `${PCS_PX()}px`,      // TTL/PCS (diperlebar saat ekspor)
      `${TOTAL_PX()}px`,    // TTL/MTR (diperlebar saat ekspor)
      `${TOTAL_PX()}px`,    // TTL/YARD (diperlebar saat ekspor)
    ];

    return (
      <colgroup>
        <For each={widths}>
          {(w) => <col style={`width:${w}`} />}
        </For>
      </colgroup>
    );
  };
  // =============================================================

  return (
    <MainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Packing List
      </h1>
      <button
        type="button"
        class="flex gap-2 bg-blue-600 text-white px-3 py-2 mb-4 rounded hover:bg-green-700"
        onClick={handlePrint}
        hidden={!isEdit}
      >
        <Printer size={20} />
        Print
      </button>

      <form class="space-y-4" onSubmit={handleSubmit}>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm mb-1">No Packing List</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().no_pl}
                readOnly
              />
            </div>
          </div>
          <div>
            <label class="block text-sm mb-1">Sales Order</label>
            <SearchableSalesOrderSelect
              salesOrders={salesOrderList}
              form={form}
              setForm={setForm}
              onChange={handleSalesOrderChange}
              disabled={isView || isEdit}
            />
          </div>
          <div hidden>
            <label class="block text-sm mb-1">Type</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={
                form().type === ""
                  ? ""
                  : form().type == 1
                  ? "Domestik"
                  : form().type == 2
                  ? "Ekspor"
                  : ""
              }
              readOnly
            />
          </div>
        </div>

        <div class="block gap-4">
          <div class="col-span-2">
            <label class="block text-sm mb-1">Keterangan</label>
            <textarea
              class="w-full border p-2 rounded"
              value={form().keterangan}
              onInput={(e) =>
                setForm({ ...form(), keterangan: e.target.value })
              }
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            ></textarea>
          </div>
        </div>

        <Show when={form().sales_order_items?.items?.length > 0}>
          <div class="border p-3 rounded my-4 bg-gray-50">
            <h3 class="text-md font-bold mb-2 text-gray-700">Quantity Kain:</h3>
            <ul class="space-y-1 pl-5">
              <For each={form().sales_order_items?.items || []}>
                {(item) => {
                  const unit = form().satuan_unit === "Yard" ? "Yard" : "Meter";
                  const sisa =
                    unit === "Meter"
                      ? Number(item.meter_total || 0) - Number(item.meter_dalam_proses || 0)
                      : Number(item.yard_total || 0) - Number(item.yard_dalam_proses || 0);

                  return (
                    <li class="text-sm list-disc">
                      <span class="font-semibold">
                        {item.corak_kain} | {item.konstruksi_kain}
                      </span>{" "}
                      - Quantity:{" "}
                      {sisa > 0 ? (
                        <span class="font-bold text-blue-600">
                          {formatNumberQty(sisa)} {unit === "Meter" ? "m" : "yd"}
                        </span>
                      ) : (
                        <span class="font-bold text-red-600">HABIS</span>
                      )}
                    </li>
                  );
                }}
              </For>
            </ul>
          </div>
        </Show>

        <div>
          <h2 class="text-lg font-bold mt-6 mb-2">Item Groups</h2>

          <Show when={form().itemGroups.length === 0 && !isView}>
            <button
              type="button"
              onClick={() => addItemGroup()}
              class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
            >
              + Tambah Item Group
            </button>
          </Show>

          <For each={form().itemGroups}>
            {(group, i) => (
              <div class="border p-4 rounded mb-6">
                <div
                  class="flex justify-between items-center mb-2 cursor-pointer"
                >
                  <h3 class="font-semibold">
                    Sales Order Item Group #{i() + 1}
                  </h3>
                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => addItemGroup()}
                      class="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 text-sm"
                      hidden={isView}
                      title="Tambah Item Group"
                    >
                      + Tambah Item Group
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeItemGroup(i()); }}
                      class="text-red-600 hover:text-red-800 text-sm"
                      hidden={isView}
                      title="Hapus Group Ini"
                    >
                      <XCircle class="w-10 h-10" />
                    </button>
                  </div>
                </div>

                <Show when={!openStates()[i()]}>
                  <div class="mb-3">
                    <label class="block text-sm mb-1">
                      Sales Order Item ID
                    </label>
                  </div>

                  <table class="w-full table-fixed border text-sm mt-2">
                    {renderColGroup()}
                    <thead class="bg-gray-100">
                      <tr>
                        <th class="border px-2 py-1">No</th>
                        <th class="border px-2 py-1">Bal</th>
                        <th class="border px-2 py-1">Col</th>
                        <th class="border px-2 py-1">Item</th>
                        <th class="border px-2 py-1">Lot</th>
                        <For each={Array.from({ length: MAX_COL_PER_ROW() }, (_, i) => i + 1)}>
                          {(n) => (
                            <th class="border px-2 py-1 text-center">{n}</th>
                          )}
                        </For>
                        <th class="border px-3 py-1 whitespace-nowrap">TTL/PCS</th>
                        <th class="border px-3 py-1 whitespace-nowrap" classList={{ "bg-gray-200": form().satuan_unit === "Yard" }}>
                          TTL/MTR
                        </th>
                        <th class="border px-3 py-1 whitespace-nowrap" classList={{ "bg-gray-200": form().satuan_unit === "Meter" }}>
                          TTL/YARD
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={chunkArrayWithIndex(group.rolls, MAX_COL_PER_ROW())}>
                        {(rollChunk, chunkIndex) =>
                          rollChunk.length > 0 && (
                            <tr>
                              <td class="border text-center align-top">
                                {chunkIndex() === 0 ? i() + 1 : ""}
                              </td>
                              <td class="border p-1 align-middle">
                                <input
                                  type="number"
                                  class="border p-1 rounded w-full"
                                  value={rollChunk[0]?.roll.no_bal ?? ""}
                                  onBlur={(e) =>
                                    handleRollChange(i(), rollChunk[0].index, "no_bal", e.currentTarget.value)
                                  }
                                  disabled={isView}
                                  classList={{ "bg-gray-200": isView }}
                                  placeholder="Input Bal..."
                                />
                              </td>
                              <td class="border p-1 align-top">
                                {chunkIndex() === 0 ? (
                                  <ColorDropdownSearch
                                    colors={soColors}
                                    item={{
                                      warna_id: rollChunk[0]?.roll.col || group.col || ""
                                    }}
                                    disabled={isView}
                                    onChange={(warnaId) => {
                                      handleRollChange(i(), rollChunk[0].index, "col", warnaId);
                                      setForm(prev => {
                                        const copy = [...prev.itemGroups];
                                        const g = { ...copy[i()] };
                                        g.col = warnaId;
                                        g.rolls = g.rolls.map((r) =>
                                          (r.col == null || r.col === "" ? { ...r, col: warnaId } : r)
                                        );
                                        copy[i()] = g;
                                        return { ...prev, itemGroups: copy };
                                      });
                                    }}
                                  />
                                ) : ("")}
                              </td>

                              {/* ITEM */}
                              <td class="border p-1 align-middle">
                                {chunkIndex() === 0 ? (
                                  <select
                                    class="w-full border rounded p-1"
                                    value={rollChunk[0]?.roll.item || ""}
                                    onInput={(e) => handleRollChange(i(), rollChunk[0].index, "item", e.currentTarget.value)}
                                    disabled={isView}
                                    classList={{ "bg-gray-200": isView }}
                                  >
                                    <option value="">Pilih Item</option>
                                    <For each={form().sales_order_items?.items || []}>
                                      {(item) => (
                                        <option value={item.id}>
                                          {item.corak_kain} | {item.konstruksi_kain}
                                        </option>
                                      )}
                                    </For>
                                  </select>
                                ) : ("")}
                              </td>

                              {/* LOT — berlaku untuk seluruh roll pada baris tsb */}
                              <td class="border p-1 align-middle">
                                <input
                                  type="number"
                                  class="border p-1 rounded w-full"
                                  value={rollChunk[0]?.roll.lot ?? ""}
                                  onBlur={(e) => handleRollChange(i(), rollChunk[0].index, "lot", e.currentTarget.value)}
                                  disabled={isView}
                                  classList={{ "bg-gray-200": isView }}
                                  placeholder="Input Lot..."
                                />
                              </td>

                              <td class="border p-1 align-middle" colSpan={MAX_COL_PER_ROW()}>
                                <div class={`grid ${MAX_COL_PER_ROW() === 10 ? 'grid-cols-10' : 'grid-cols-5'} gap-1`}>
                                  <For each={rollChunk}>
                                    {(r) => (
                                      <div class="relative">
                                        <input
                                          type="text"
                                          inputmode="decimal"
                                          class="border w-full text-right text-[11px] leading-5 px-1 pr-6 rounded-sm"
                                          value={
                                            form().satuan_unit === "Yard"
                                              ? formatRollCellValue(r.roll.yard)
                                              : formatRollCellValue(r.roll.meter)
                                          }
                                          onBlur={(e) =>
                                            handleRollChange(
                                              i(),
                                              r.index,
                                              form().satuan_unit === "Yard" ? "yard" : "meter",
                                              e.currentTarget.value
                                            )
                                          }
                                          disabled={isView}
                                          classList={{ "bg-gray-200": isView }}
                                        />
                                        <button
                                          type="button"
                                          class="absolute inset-y-0 right-0 px-1 flex items-center justify-center rounded-r-sm bg-red-500 text-white"
                                          onClick={() => removeRoll(i(), r.index)}
                                          hidden={isView}
                                          title="Hapus roll ini"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    )}
                                  </For>
                                </div>
                              </td>

                              <td class="border text-center align-top">
                                {rollChunk.filter((rc) => hasQty(rc.roll)).length}
                              </td>
                              <td class="border text-right px-3 align-top" classList={{ "bg-gray-200": form().satuan_unit === "Yard" }}>
                                {formatNumber(rollChunk.reduce((sum, r) => sum + (hasQty(r.roll) ? Number(r.roll.meter || 0) : 0),0))}
                              </td>
                              <td class="border text-right px-3 align-top" classList={{ "bg-gray-200": form().satuan_unit === "Meter" }}>
                                {formatNumber(rollChunk.reduce((sum, r) => sum + (hasQty(r.roll) ? Number(r.roll.yard  || 0) : 0),0))}
                              </td>
                            </tr>
                          )
                        }
                      </For>

                      <tr>
                        <td
                          colSpan={5 + MAX_COL_PER_ROW()}
                          class="border px-2 py-1 font-semibold text-left"
                        >
                          Sub Total
                        </td>
                        <td class="border px-3 py-1 text-right">
                          {group.rolls.filter(hasQty).length}
                        </td>
                        <td class="border px-3 py-1 text-right" classList={{ "bg-gray-200": form().satuan_unit === "Yard" }}>
                          {formatNumber(group.rolls.reduce((sum, r) => sum + (hasQty(r) ? Number(r.meter || 0) : 0), 0))} m
                        </td>
                        <td class="border px-3 py-1 text-right" classList={{ "bg-gray-200": form().satuan_unit === "Meter" }}>
                          {formatNumber(group.rolls.reduce((sum, r) => sum + (hasQty(r) ? Number(r.yard  || 0) : 0), 0))} yd
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div class="mt-4 flex flex-wrap gap-2 items-center">
                    <input
                      type="number"
                      min="1"
                      class="border p-1 rounded w-24"
                      placeholder="Jumlah"
                      value={groupRollCounts()[i()] ?? ""}
                      onInput={(e) => {
                        const raw = e.currentTarget.value;
                        const val = raw === "" ? null : Number(raw);
                        setGroupRollCounts((prev) => {
                          const updated = [...prev];
                          updated[i()] = Number.isFinite(val) && val > 0 ? val : null;
                          return updated;
                        });
                      }}
                      hidden={isView}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cached = groupRollCounts()[i()];
                        const count = cached == null ? 1 : cached;
                        addMultipleRolls(i(), count);
                        setGroupRollCounts((prev) => {
                          const updated = [...prev];
                          updated[i()] = null;
                          return updated;
                        });
                      }}
                      class="bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                      hidden={isView}
                    >
                      + Tambah
                    </button>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>

        <Show when={form().itemGroups.length > 0}>
          <div class="mt-6 border rounded">
            <table class="w-full table-fixed border text-sm">
              {renderColGroup()}
              <thead class="bg-gray-200">
                <tr>
                  <th
                    class="border px-2 py-1 text-left"
                    colSpan={5 + MAX_COL_PER_ROW()}
                  >
                    Total
                  </th>
                  <th class="border px-2 py-1 text-right">
                    {form().itemGroups.reduce(
                      (acc, g) => acc + g.rolls.filter(hasQty).length,
                      0
                    )}
                  </th>
                  <th class="border px-2 py-1 text-right">
                      {formatNumber(form().itemGroups.flatMap(g => g.rolls).reduce((sum, r) => sum + (hasQty(r) ? Number(r.meter || 0) : 0), 0))} m
                  </th>
                  <th class="border px-2 py-1 text-right">
                      {formatNumber(form().itemGroups.flatMap(g => g.rolls).reduce((sum, r) => sum + (hasQty(r) ? Number(r.yard  || 0) : 0), 0))} yd
                  </th>
                </tr>
              </thead>
            </table>
          </div>
        </Show>

        <div class="mt-6">
          <button
            type="submit"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Simpan
          </button>
        </div>
      </form>
    </MainLayout>
  );
}

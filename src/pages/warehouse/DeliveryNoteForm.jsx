import { createSignal, For, onMount, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getAllPackingLists,
  getPackingLists,
  createDeliveryNote,
  updateDataDeliveryNote,
  getUser,
  getDeliveryNotes,
  getLastSequence,
  getAllSalesOrders,
  getAllCustomers,
  getAllFabrics,
} from "../../utils/auth";
import SuratJalanPrint from "../print_function/sell/SuratJalanPrint";
import SearchableSalesOrderSelect from "../../components/SalesOrderSearch";
import IndeterminateCheckbox from "../../components/Indeterminate";
import { Printer, Trash2 } from "lucide-solid";

export default function DeliveryNoteForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === 'true';
  const navigate = useNavigate();
  const user = getUser();

  const [packingLists, setPackingLists] = createSignal([]);
  const [lastNumberSequence, setLastNumberSequence] = createSignal(null);
  const [showPreview, setShowPreview] = createSignal(false);
  const [salesOrders, setSalesOrders] = createSignal([]);
  const [todayDate] = createSignal(new Date().toISOString().slice(0, 10));
  const [hasInitializedEdit, setHasInitializedEdit] = createSignal(false);
  const [deliveryNoteData, setDeliveryNoteData] = createSignal(null); 
  const [customersList, setCustomersList] = createSignal([]);

  const qtyCounterbySystem = (pl, satuanUnit) => {
    let total = 0;
    let terkirim = 0;

    switch (satuanUnit) {
      case "Meter":
        total = parseFloat(pl.summary?.total_meter || 0);
        terkirim = parseFloat(pl.summary?.total_meter_dalam_proses || 0);
        break;
      case "Yard":
        total = parseFloat(pl.summary?.total_yard || 0);
        terkirim = parseFloat(pl.summary?.total_yard_dalam_proses || 0);
        break;
      case "Kilogram":
        total = parseFloat(pl.summary?.total_kilogram || 0);
        terkirim = parseFloat(pl.summary?.total_kilogram_dalam_proses || 0);
        break;
      default:
        return "-";
    }

    const sisa = total - terkirim;
    if (sisa <= 0) return "SELESAI";

    return `${sisa.toLocaleString("id-ID")} / ${total.toLocaleString("id-ID")}`;
  };

  const [form, setForm] = createSignal({
    no_sj: "",
    sequence_number: "",
    no_surat_jalan_supplier: "",
    tanggal_surat_jalan: new Date().toISOString().split("T")[0],
    keterangan: "",
    itemGroups: [], 
    no_mobil: "",
    sopir: "",
    delivered_status: 0,
  });

  onMount(async () => {
    const pls = await getAllPackingLists(user?.token);
    //console.log("Data PL: ", JSON.stringify(pls, null, 2));
    const dataSalesOrders = await getAllSalesOrders(user?.token);
    setSalesOrders(dataSalesOrders.orders || []);

    if (isEdit) {
      const res = await getDeliveryNotes(params.id, user?.token);
      //console.log("Data SJ: ", JSON.stringify(res, null, 2));
      if (!res || !res.order) return;

      setDeliveryNoteData(res.order); 
      const deliveryNote = res.order;

      const selectedSO = dataSalesOrders.orders?.find(
        (so) => so.no_so === deliveryNote.no_so
      );

      if (selectedSO) {
        const relatedPackingLists = pls?.packing_lists?.filter(
          (pl) => pl.so_id === selectedSO.id
        );
        setPackingLists(relatedPackingLists || []);
      }

      const deliveredRollsSet = new Set();
      (deliveryNote.packing_lists || []).forEach(pl => {
        (pl.items || []).forEach(item => {
          (item.rolls || []).forEach(roll => {
            // backend mengembalikan 'pli_roll_id' = id roll di Packing List
            deliveredRollsSet.add(roll.pli_roll_id);
          });
        });
      });

      const existingLotByPlId = new Map();
        (deliveryNote.packing_lists || []).forEach(pl => {
          const lots = new Set();
          (pl.items || []).forEach(it => {
            if (it.lot) {
              String(it.lot)
                .split(",")
                .map(s => s.trim())
                .filter(Boolean)
                .forEach(v => lots.add(v));
            }
          });
          existingLotByPlId.set(pl.id, Array.from(lots).join(","));
      });

      const itemGroups = await Promise.all(
        (deliveryNote.packing_lists || []).map(async (pl) => {
          const plDetail = await getPackingLists(pl.id, user?.token);
          //console.log("Data PL : ", JSON.stringify(plDetail, null, 2));
          const fullPl = plDetail?.order;

          // let items = (fullPl.items || []).flatMap(item =>
          //   (item.rolls || []).map(roll => ({
          //     id: item.id,
          //     packing_list_roll_id: roll.id,
          //     meter: roll.meter,
          //     yard: roll.yard,
          //     packing_list_item_id: item.id,
          //     konstruksi_kain: item.konstruksi_kain || "",
          //     row_num: roll.row_num,
          //     col_num: roll.col_num,
          //     checked: !!deliveredPlItemMap[item.id],
          //     disabled: !!deliveredPlItemMap[item.id],
          //   }))
          // );

          let items = (fullPl.items || []).flatMap(item =>
            (item.rolls || []).map(roll => {
              const isInThisSJ = deliveredRollsSet.has(roll.id); // roll.id = ID roll di PL
              return {
                packing_list_roll_id: roll.id,
                meter: roll.meter,
                yard: roll.yard,
                kilogram: roll.kilogram,
                packing_list_item_id: item.id,
                konstruksi_kain: item.konstruksi_kain || "",
                row_num: roll.row_num,
                col_num: roll.col_num,
                checked: isInThisSJ,   // yang pernah dipilih → checked
                disabled: false,       // di EDIT semuanya tetap checkbox (tidak pakai label "Terkirim")
              };
            })
          );

          if (isView) {
            items = items.filter(r => r.checked);
          }

          return {
            packing_list_id: fullPl.id,
            no_pl: fullPl.no_pl,
            type: deliveryNote.type,
            lot: existingLotByPlId.get(fullPl.id) || "",
            items,
          };
        })
      );

      setForm({
        no_sj: deliveryNote.no_sj,
        sequence_number: deliveryNote.no_sj, 
        no_surat_jalan_supplier: deliveryNote.no_surat_jalan_supplier || "", 
        tanggal_surat_jalan: new Date(deliveryNote.created_at).toISOString().split("T")[0],
        keterangan: deliveryNote.keterangan,
        itemGroups, // ✅ sekarang semua roll tampil
        ppn: selectedSO?.ppn_percent ?? 0,
        sales_order_id: selectedSO?.id ?? null, 
        no_mobil: deliveryNote.no_mobil,
        sopir: deliveryNote.sopir,
        delivered_status: deliveryNote.delivered_status,
      });
    }
    else {
      setPackingLists(pls?.packing_lists || []);
    }
  });

  const generateNomorKontrak = async () => {
    const lastSeq = await getLastSequence(
      user?.token,
      "s_sj",
      form().type == 1 ? "domestik" : form().type == 2 ? "ekspor" : "domestik",
      form().ppn // pastikan ini sudah ada dari salesOrder
    );

    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const ppnValue = parseFloat(form().ppn) || 0;
    const ppnType = ppnValue > 0 ? "P" : "N";
    const type = form().type == 1 ? "D" : form().type == 2 ? "E" : "D";
    const mmyy = `${month}${year}`;
    const nomor = `SJ/${type}/${ppnType}/${mmyy}/${nextNum}`;
    setForm((prev) => ({
      ...prev,
      sequence_number: nomor,
      no_seq: lastSeq?.last_sequence + 1,
    }));
  };

  const addPackingListGroup = () => {
    setForm((prev) => ({
      ...prev,
      itemGroups: [
        ...prev.itemGroups,
        {
          packing_list_id: "",
          no_pl: "",
          type: "",
          items: [],
        },
      ],
    }));
  };

  const removePackingListGroup = (groupIndex) => {
    setForm((prev) => {
      const groups = [...prev.itemGroups];
      groups.splice(groupIndex, 1);
      return { ...prev, itemGroups: groups };
    });
  };

  const handleSelectAll = (groupIndex, checked) => {
    setForm((prev) => {
      const groups = [...prev.itemGroups];
      // groups[groupIndex] = {
      //   ...groups[groupIndex],
      //   items: groups[groupIndex].items.map((item) =>
      //     item.disabled ? item : { ...item, checked }
      //   ),
      // };
         groups[groupIndex] = {
     ...groups[groupIndex],
     items: groups[groupIndex].items.map((item) => ({ ...item, checked })),
   };
      return { ...prev, itemGroups: groups };
    });
  };

  const handlePackingListChange = async (groupIndex, plId) => {
    if (!plId) return;

    const plDetail = await getPackingLists(plId, user?.token);
    const pl = plDetail?.order;

    const typeLetter = pl?.no_pl?.split("/")?.[1] || "";
    let typeValue = "";
    if (typeLetter === "D") typeValue = "Domestik";
    else if (typeLetter === "E") typeValue = "Ekspor";

    const currentGroup = form().itemGroups[groupIndex];
    const allRolls = [];

    (pl?.items || []).forEach((item) => {
      (item.rolls || []).forEach((roll) => {
        const wasSent = currentGroup.items.some(
          (it) => it.packing_list_roll_id === roll.id
        );

        allRolls.push({
          packing_list_roll_id: roll.id,
          meter: roll.meter,
          yard: roll.yard,
          kilogram: roll.kilogram,
          //sales_order_item_id: item.sales_order_item_id,
          packing_list_item_id: item.id,
          konstruksi_kain: item.konstruksi_kain,
          row_num: roll.row_num,
          col_num: roll.col_num,
          checked: wasSent,
          disabled: wasSent,
        });
      });
    });

    setForm((prev) => {
      const groups = [...prev.itemGroups];
      groups[groupIndex] = {
        packing_list_id: plId,
        no_pl: pl?.no_pl,
        type: typeValue,
        lot: groups[groupIndex]?.lot ?? "",
        items: allRolls,
      };
      return {
        ...prev,
        itemGroups: groups,
      };
    });
  };

  const handleRollCheckedChange = (groupIndex, rollIndex, checked) => {
    setForm((prev) => {
      const groups = [...prev.itemGroups];
      if (groups[groupIndex].items[rollIndex].disabled) {
        return prev; // 🚫 skip kalau sudah terkirim
      }
      groups[groupIndex].items[rollIndex].checked = checked;
      return {
        ...prev,
        itemGroups: groups,
      };
    });
  };

  const sanitizeLot = (v) =>
    String(v ?? "")
      .replace(/[^0-9,]/g, "")     // hanya angka & koma
      .replace(/,{2,}/g, ",")      // buang koma ganda
      .replace(/(^,|,$)/g, "");    // buang koma di awal/akhir

  const handleGroupLotBlur = (groupIndex, value) => {
    setForm(prev => {
      const groups = [...prev.itemGroups];
      groups[groupIndex] = {
        ...groups[groupIndex],
        lot: sanitizeLot(value),
      };
      return { ...prev, itemGroups: groups };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedRolls = form().itemGroups.flatMap((group) =>
      group.items.filter((item) => item.checked)  // ⬅️ hapus && !item.disabled
    );

    const groupedItems = {};

    const lotByPlItemId = new Map();
    form().itemGroups.forEach(g => {
      const lotVal = String(g.lot || "");
      (g.items || []).forEach(it => {
        lotByPlItemId.set(it.packing_list_item_id, lotVal);
      });
    });

    // 3. Iterasi dan kelompokkan setiap roll
    for (const roll of selectedRolls) {
      const groupId = roll.packing_list_item_id;

      if (!groupedItems[groupId]) {
        groupedItems[groupId] = {
          pl_item_id: groupId,
          lot: "",
          meter_total: 0,
          yard_total: 0,
          kilogram_total: 0,
          rolls: [],
        };
      }

      groupedItems[groupId].rolls.push({
        //id: roll.id,
        pli_roll_id: roll.packing_list_roll_id,
        row_num: roll.row_num, 
        col_num: roll.col_num, 
        meter: roll.meter || 0,
        yard: roll.yard || 0,
        kilogram: roll.kilogram ?? null,
      });

      // Akumulasikan total untuk grup tersebut
      groupedItems[groupId].meter_total += parseFloat(roll.meter || 0);
      groupedItems[groupId].yard_total += parseFloat(roll.yard || 0);
      groupedItems[groupId].kilogram_total += parseFloat(roll.kilogram || 0);
    }

    // 4. Ubah objek hasil pengelompokan menjadi array yang diinginkan backend
    const finalItemsPayload = Object.values(groupedItems).map((group) => {
      // Pastikan kilogram_total menjadi null jika totalnya 0, sesuai format backend
      if (group.kilogram_total === 0) {
        group.kilogram_total = null;
      }
      // Pembulatan untuk menghindari angka desimal yang panjang
      group.meter_total = parseFloat(group.meter_total.toFixed(2));
      group.yard_total = parseFloat(group.yard_total.toFixed(2));
      group.lot = lotByPlItemId.get(group.pl_item_id) || "";
      return group;
    });

    const plIds = form().itemGroups.map((g) => Number(g.packing_list_id));

    // 5. Buat payload akhir dengan struktur items yang sudah benar
    const payload = isEdit
      ? {
          // (Logika untuk update perlu disesuaikan jika berbeda)
          no_sj: form().no_sj,
          pl_ids: plIds,
          no_mobil: form().no_mobil || null,
          sopir: form().sopir || null,
          keterangan: form().keterangan,
          items: finalItemsPayload,
        }
      : {
          type: form().itemGroups[0]?.type?.toLowerCase() || "domestik",
          sequence_number: form().no_seq || 1,
          pl_ids: plIds,
          no_mobil: form().no_mobil || null,
          sopir: form().sopir || null,
          keterangan: form().keterangan,
          items: finalItemsPayload, // <-- Gunakan data yang sudah ditransformasi
        };

    try {
      if (isEdit) {
        //console.log("UPDATE payload:", JSON.stringify(payload, null, 2));
        await updateDataDeliveryNote(user?.token, params.id, payload);
      } else {
        //console.log("CREATE payload:", JSON.stringify(payload, null, 2));
        await createDeliveryNote(user?.token, payload);
      }
      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil Update" : "Berhasil Simpan",
        showCancelButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/deliverynote"));
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error?.message || "Terjadi kesalahan.",
        showCancelButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  function handlePrint() {
    if (!deliveryNoteData()) {
        console.error("Data for printing is not available yet.");
        Swal.fire("Error", "Data cetak tidak ditemukan.", "error");
        return;
    }

    const dataToPrint = {
        ...deliveryNoteData(), 
        ...form(),            
    };
    //console.log("📄 Data yang dikirim ke halaman Print:", JSON.stringify(form(), null, 2));
    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/suratjalan?data=${encodedData}`, "_blank");
}

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Surat Jalan Packing List
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

      <form onSubmit={handleSubmit} class="space-y-4">
        <SearchableSalesOrderSelect
          salesOrders={salesOrders}
          form={form}
          setForm={setForm}
          disabled={isView || isEdit}
          classList={{ "bg-gray-200" : isView || isEdit}}
          onChange={(so) => {
            // Isi nilai PPN dari Sales Order yang dipilih ke form
            setForm((prev) => ({
              ...prev,
              ppn: so.ppn, // pastikan Sales Order punya property `ppn`
            }));
            getAllPackingLists(user?.token).then((pls) => {
              const filtered = pls?.packing_lists.filter(
                (pl) => pl.so_id === so.id
              );
              setPackingLists(filtered || []);
              if (!filtered || filtered.length === 0) {
                Swal.fire({
                  icon: "info",
                  title: "Tidak ada packing list",
                  text: "Sales order ini belum memiliki packing list.",
                });
              }
            });
          }}
        />

        {form().sales_order_id && (
          <>
          <div class="w-full grid grid-cols-3 gap-4">
            <div class="w-full mt-4">
              <label class="text-sm font-medium">No. Surat Jalan</label>
              <div class="flex gap-2">
                <input
                  type="text"
                  value={form().sequence_number || ""}
                  class="w-full border p-2 rounded bg-gray-100"
                  disabled={true}
                  classList={{ "bg-gray-200" : true }}
                />
                <button
                  type="button"
                  class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400"
                  onClick={generateNomorKontrak}
                  hidden={isEdit}
                >
                  Generate
                </button>
              </div>
            </div>

            <div class="w-full mt-4">
              <label class="text-sm font-medium">Tanggal Surat Jalan</label>
              <input
                type="date"
                class="w-full border p-2 rounded bg-gray-100"
                value={form().tanggal_surat_jalan}
                disabled={isView}
                classList={{ "bg-gray-200" : isView }}
              />
            </div>

            <div class="w-full mt-4">
              <label class="text-sm font-medium">No. Mobil</label>
              <input
                type="text"
                class="w-full border p-2 rounded"
                value={form().no_mobil || ""}
                onInput={(e) => setForm({ ...form(), no_mobil: e.target.value })}
                disabled={isView}
                classList={{ "bg-gray-200" : isView }}
              />
            </div>

            <div class="w-full mt-4">
              <label class="text-sm font-medium">Sopir</label>
              <input
                type="text"
                class="w-full border p-2 rounded"
                value={form().sopir || ""}
                onInput={(e) => setForm({ ...form(), sopir: e.target.value })}
                disabled={isView}
                classList={{ "bg-gray-200" : isView }}
              />
            </div>
          </div>
          
          <div class="w-full mt-2">
            <label class="text-sm font-medium">Keterangan</label>
            <textarea
              class="w-full border p-2 rounded"
              rows="3"
              value={form().keterangan || ""}
              onInput={(e) => setForm({ ...form(), keterangan: e.target.value })}
              disabled={isView}
              classList={{ "bg-gray-200" : isView }}
            ></textarea>
          </div>
          </>
        )}

        <button
          type="button"
          onClick={() => addPackingListGroup()}
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
          disabled={!form().sales_order_id}
          hidden={isView}
        >
          + Tambah Packing List
        </button>

        <For each={form().itemGroups}>
          {(group, groupIndex) => {
            return (
              <div class="border p-4 mb-4 rounded">
                <div class="mb-2 flex justify-between items-center">
                  <h3 class="font-semibold text-lg">
                    {group.no_pl || `Packing List #${groupIndex() + 1}`}
                  </h3>
                  <button
                    type="button"
                    class="text-red-600 hover:text-red-800 text-sm"
                    onClick={() => removePackingListGroup(groupIndex())}
                    hidden={isView}
                  >
                    <Trash2 size={25} />
                  </button>
                </div>

                <select
                  class="w-full border p-2 rounded mb-4"
                  value={group.packing_list_id}
                  onInput={(e) => handlePackingListChange(groupIndex(), e.target.value)}
                  disabled={isView}
                  classList={{ "bg-gray-200": isView }}
                >
                  <option value="">Pilih Packing List</option>
                  <For each={packingLists().filter(
                    (pl) => qtyCounterbySystem(pl, pl.satuan_unit) !== "SELESAI"
                  )}>
                    {(pl) => <option value={pl.id}>{pl.no_pl}</option>}
                  </For>
                </select>

                <div class="mb-3 flex items-center gap-3">
                  <label class="text-sm font-medium w-6">Lot: </label>
                  <input
                    type="text"
                    class="border p-1 rounded w-48"
                    value={group.lot ?? ""}
                    onBlur={(e) => handleGroupLotBlur(groupIndex(), e.currentTarget.value)}
                    disabled={isView}
                    classList={{ "bg-gray-200": isView }}
                  />
                </div>

                <Show when={group.items?.length}>
                  <table class="w-full border border-gray-300 text-sm mb-3">
                    <thead class="bg-gray-100">
                      <tr>
                        <th class="border px-2 py-1">#</th>
                        <th class="border px-2 py-1">Konstruksi Kain</th>
                        <th class="border px-2 py-1">Meter</th>
                        <th class="border px-2 py-1">Yard</th>
                        
                        <Show
                            when={!isView}
                            fallback={<th class="border px-2 py-1 text-center">Status</th>}
                          >
                          <th class="border px-2 py-1 text-center">
                            <div class="flex flex-col items-center">
                              <span class="mb-1">Pilih Semua</span>
                              <IndeterminateCheckbox
                                checked={
                                  group.items.length > 0 &&
                                  group.items.every((i) => i.checked || i.disabled)
                                }
                                indeterminate={
                                  group.items.some((i) => i.checked) &&
                                  !group.items.every((i) => i.checked || i.disabled)
                                }
                                onChange={(e) =>
                                  handleSelectAll(groupIndex(), e.currentTarget.checked)
                                }
                              />
                            </div>
                          </th>
                        </Show>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={group.items}>
                        {(roll, rollIndex) => (
                          <tr>
                            <td class="border px-2 py-1 text-center">
                              {rollIndex() + 1}
                            </td>
                            <td class="border px-2 py-1">
                              {roll.konstruksi_kain}
                            </td>
                            <td class="border px-2 py-1 text-right">
                              {roll.meter}
                            </td>
                            <td class="border px-2 py-1 text-right">
                              {roll.yard}
                            </td>

                            <td class="border px-2 py-1 text-center">
                              {/* <Show
                                when={!isView}
                                fallback={
                                  <span
                                    classList={{
                                      "font-semibold": true,
                                      "text-green-600": form().delivered_status === 1,
                                      "text-gray-500": form().delivered_status !== 1,
                                    }}
                                  >
                                    {form().delivered_status === 1
                                      ? "Terkirim"
                                      : "Belum Terkirim"}
                                  </span>
                                }
                              >
                                <Show
                                  when={!roll.disabled}
                                  fallback={<span class="italic text-gray-500">Terkirim</span>}
                                >
                                  <input
                                    type="checkbox"
                                    checked={roll.checked}
                                    onChange={(e) =>
                                      handleRollCheckedChange(
                                        groupIndex(),
                                        rollIndex(),
                                        e.target.checked
                                      )
                                    }
                                  />
                                </Show>
                              </Show> */}
                                <Show
                                  when={!isView}
                                  fallback={
                                    <span
                                      classList={{
                                        "font-semibold": true,
                                        "text-green-600": form().delivered_status === 1,
                                        "text-gray-500": form().delivered_status !== 1,
                                      }}
                                    >
                                      {form().delivered_status === 1 ? "Terkirim" : "Belum Terkirim"}
                                    </span>
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    checked={roll.checked}
                                    onChange={(e) =>
                                      handleRollCheckedChange(groupIndex(), rollIndex(), e.target.checked)
                                    }
                                  />
                                </Show>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>

                  {/* TOTAL */}
                  <div class="border-t pt-4 mt-4">
                    <div class="text-right font-semibold text-sm">
                      Total Keseluruhan:
                    </div>
                    <table class="ml-auto text-sm mt-1 border border-gray-300">
                      <thead class="bg-gray-100">
                        <tr>
                          <th class="px-4 py-2 border">Total Meter</th>
                          <th class="px-4 py-2 border">Total Yard</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td class="px-4 py-2 border text-right">
                            {form()
                              .itemGroups?.reduce((sum, group) => {
                                return (
                                  sum +
                                  group.items?.reduce((s, item) => {
                                    return (
                                      s +
                                      (item.checked
                                        ? parseFloat(item.meter || 0)
                                        : 0)
                                    );
                                  }, 0)
                                );
                              }, 0)
                              ?.toFixed(2)}
                          </td>
                          <td class="px-4 py-2 border text-right">
                            {form()
                              .itemGroups?.reduce((sum, group) => {
                                return (
                                  sum +
                                  group.items?.reduce((s, item) => {
                                    return (
                                      s +
                                      (item.checked
                                        ? parseFloat(item.yard || 0)
                                        : 0)
                                    );
                                  }, 0)
                                );
                              }, 0)
                              ?.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>

        <div class="mt-6">
          <button
            type="submit"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            hidden={isView}
          >
            Simpan
          </button>
        </div>
      </form>
    </MainLayout>
  );
}

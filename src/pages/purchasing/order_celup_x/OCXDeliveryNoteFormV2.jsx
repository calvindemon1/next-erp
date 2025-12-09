import {
  createSignal,
  createEffect,
  For,
  onMount,
  Show,
  createMemo,
} from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getOCX,
  createSJOCX,
  getUser,
  getSJOCX,
  getAllOCX,
  getLastSequence,
  updateSJOCX,
} from "../../../utils/auth";
import OCXDropdownSearch from "../../../components/OCXDropdownSearch";
import { Printer, Trash2 } from "lucide-solid";

export default function OCXDeliveryNoteForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === "true";
  const navigate = useNavigate();
  const user = getUser();

  const [orderCelupList, setOrderCelupList] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [deliveryNoteData, setDeliveryNoteData] = createSignal(null);
  const [deletedItems, setDeletedItems] = createSignal([]);

  const [form, setForm] = createSignal({
    sequence_number: "",
    no_sj_ex: "",
    keterangan: "",
    purchase_order_id: null,
    purchase_order_items: null,
    no_sj_supplier: "",
    tanggal_kirim: "",
    alamat_pengiriman: "",
    unit: "Meter",
    itemGroups: [],
  });

  const totalMeter = createMemo(() =>
    form().itemGroups.reduce(
      (sum, group) => sum + (Number(group.meter_total) || 0),
      0
    )
  );

  const totalYard = createMemo(() =>
    form().itemGroups.reduce(
      (sum, group) => sum + (Number(group.yard_total) || 0),
      0
    )
  );

  const totalAll = createMemo(() =>
    form().itemGroups.reduce((sum, group) => {
      const quantity =
        form().unit === "Meter" ? group.meter_total : group.yard_total;
      const subtotal =
        (Number(group.item_details?.harga) || 0) * (Number(quantity) || 0);
      return sum + subtotal;
    }, 0)
  );

  onMount(async () => {
    setLoading(true);
    
    try {
      const poListResponse = await getAllOCX(user?.token);
      setOrderCelupList(poListResponse.data || []);

      if (isEdit) {
        const sjResponse = await getSJOCX(params.id, user?.token);
        const suratJalanData = sjResponse?.data;
        
        if (!suratJalanData) {
          setLoading(false);
          Swal.fire("Error", "Data Surat Penerimaan OCX tidak ditemukan.", "error");
          return;
        }

        const poDetailResponse = await getOCX(suratJalanData.po_ex_id, user?.token);
        const poData = poDetailResponse?.data;

        const fullPrintData = {
          ...suratJalanData,
          purchase_order_detail: poData
        };
        setDeliveryNoteData(fullPrintData);

        setForm({
          ...form(),
          no_sj_ex: suratJalanData.no_sj_ex || "",
          no_sj_supplier: suratJalanData.no_sj_supplier || "",
          alamat_pengiriman: suratJalanData.alamat_pengiriman || "",
          tanggal_kirim: suratJalanData.tanggal_kirim
            ? new Date(suratJalanData.tanggal_kirim).toISOString().split("T")[0]
            : "",
          purchase_order_id: suratJalanData.po_ex_id,
          purchase_order_items: poData,
          sequence_number: suratJalanData.sequence_number,
          keterangan: suratJalanData.keterangan || "",
          unit: poData?.satuan_unit_name || "Meter",
          itemGroups: (suratJalanData.items || [])
            .filter((group) => !group.deleted_at)
            .map((group) => {
              const poItem = poData?.items?.find(
                (item) => item.id === group.po_ex_item_id
              );

              return {
                id: group.id,
                purchase_order_item_id: group.po_ex_item_id,
                item_details: {
                  corak_kain: poItem?.corak_kain || "N/A",
                  konstruksi_kain: poItem?.konstruksi_kain || "",
                  deskripsi_warna: poItem?.deskripsi_warna || "",
                  lebar_greige: poItem?.lebar_greige || 0,
                  lebar_finish: poItem?.lebar_finish || 0,
                  harga: poItem?.harga || 0,
                },
                meter_total: group.meter_total || 0,
                yard_total: group.yard_total || 0,
                gulung: typeof group.gulung === "number" ? group.gulung : 0,
                lot: typeof group.lot === "number" ? group.lot : 0,
              };
            }),
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Swal.fire("Error", "Gagal memuat data.", "error");
    } finally {
      setLoading(false);
    }
  });

  const removeItem = (index) => {
    setForm((prev) => {
      const updatedItemGroups = [...prev.itemGroups];
      const [removed] = updatedItemGroups.splice(index, 1);

      if (removed?.id) {
        setDeletedItems((prevDeleted) => [...prevDeleted, removed.id]);
      }

      return { ...prev, itemGroups: updatedItemGroups };
    });
  };

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

  const parseNumber = (str) => {
    if (typeof str !== "string" || !str) return 0;
    const cleaned = str.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const formatHarga = (val) => {
    if (val === null || val === "") return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatIDR = (val) => {
    if (val === null || val === "") return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleQuantityChange = (index, value) => {
    const unit = form().unit;
    const numValue = parseNumber(value);

    setForm((prev) => {
      const updatedItemGroups = [...prev.itemGroups];
      const itemToUpdate = { ...updatedItemGroups[index] };

      if (unit === "Meter") {
        itemToUpdate.meter_total = numValue;
        itemToUpdate.yard_total = numValue * 1.093613;
      } else {
        itemToUpdate.yard_total = numValue;
        itemToUpdate.meter_total = numValue / 1.093613;
      }

      updatedItemGroups[index] = itemToUpdate;
      return { ...prev, itemGroups: updatedItemGroups };
    });
  };

  const handleGulungChange = (index, value) => {
    const numValue = parseNumber(value);
    setForm((prev) => {
      const arr = [...prev.itemGroups];
      arr[index] = { ...arr[index], gulung: numValue };
      return { ...prev, itemGroups: arr };
    });
  };

  const handleLotChange = (index, value) => {
    const numValue = parseNumber(value);
    setForm((prev) => {
      const arr = [...prev.itemGroups];
      arr[index] = { ...arr[index], lot: numValue };
      return { ...prev, itemGroups: arr };
    });
  };

  const handleSuratJalanChange = async (selectedPO) => {
    if (!selectedPO) return;

    try {
      const res = await getOCX(selectedPO.id, user?.token);
      const selectedPOData = res?.data;

      // Generate SJ number
      const poTypeLetter = "OCX";
      const poPPN = selectedPO.no_po_ex.split("/")[2];
      const ppnValue = poPPN === "P" ? 1 : 0;

      const { newSJNumber, newSequenceNumber } = await generateSJNumber(
        poTypeLetter,
        ppnValue
      );

      const unitName = selectedPOData?.satuan_unit_name || "Meter";
      const newItemGroups = (selectedPOData?.items || []).map((item) =>
        templateFromPOItem(item, unitName)
      );

      setForm({
        ...form(),
        purchase_order_id: selectedPO.id,
        purchase_order_items: selectedPOData,
        no_sj_ex: newSJNumber,
        sequence_number: newSequenceNumber,
        alamat_pengiriman: selectedPOData?.supplier_alamat || "",
        unit: unitName,
        itemGroups: newItemGroups,
      });
    } catch (error) {
      console.error("Error loading OCX detail:", error);
      Swal.fire("Error", "Gagal memuat detail OCX.", "error");
    }
  };

  const generateSJNumber = async (salesType, ppn) => {
    try {
      const lastSeq = await getLastSequence(user?.token, "sj_ex", salesType, ppn);

      const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(3, "0");
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = String(now.getFullYear()).slice(2);
      const ppnValue = parseFloat(ppn) || 0;
      const type = ppnValue > 0 ? "P" : "N";
      const mmyy = `${month}${year}`;
      const nomor = `SJ/OCX/${type}/${mmyy}-${nextNum}`;

      return {
        newSJNumber: nomor,
        newSequenceNumber: (lastSeq?.last_sequence || 0) + 1,
      };
    } catch (error) {
      console.error("Error generating SJ number:", error);
      return {
        newSJNumber: "SJ/OCX/N/0000-001",
        newSequenceNumber: 1
      };
    }
  };

  const templateFromPOItem = (poItem) => {
    const m = Number(poItem.meter_total ?? poItem.meter ?? 0) || 0;
    const y = Number(poItem.yard_total ?? poItem.yard ?? 0) || 0;

    const hasM = m > 0;
    const hasY = y > 0;

    const meterVal = hasM ? m : hasY ? y * 0.9144 : 0;
    const yardVal = hasY ? y : hasM ? m * 1.093613 : 0;

    return {
      purchase_order_item_id: poItem.id,
      item_details: {
        corak_kain: poItem.corak_kain,
        konstruksi_kain: poItem.konstruksi_kain,
        deskripsi_warna: poItem.deskripsi_warna,
        lebar_greige: poItem.lebar_greige,
        lebar_finish: poItem.lebar_finish,
        harga: poItem.harga,
      },
      meter_total: meterVal,
      yard_total: yardVal,
      gulung: 0,
      lot: 0,
    };
  };

  const addItemGroup = () => {
    const poDetail = form().purchase_order_items;
    if (!poDetail || !poDetail.items || poDetail.items.length === 0) {
      Swal.fire(
        "Peringatan",
        "Silakan pilih OCX terlebih dahulu.",
        "warning"
      );
      return;
    }

    const paketBaru = poDetail.items.map(templateFromPOItem);

    setForm((prev) => ({
      ...prev,
      itemGroups: [...prev.itemGroups, ...paketBaru],
    }));
  };

  const handleKeyDown = (e) => {
    const tag = e.target.tagName;
    const type = e.target.type;

    if (
      e.key === "Enter" &&
      tag !== "TEXTAREA" &&
      type !== "submit" &&
      type !== "button"
    ) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi
    if (!form().purchase_order_id) {
      Swal.fire("Gagal", "Harap pilih OCX terlebih dahulu.", "error");
      return;
    }
    if (!form().no_sj_supplier.trim()) {
      Swal.fire("Gagal", "Harap isi No Surat Jalan Supplier.", "error");
      return;
    }
    if (form().itemGroups.length === 0) {
      Swal.fire("Gagal", "Harap tambahkan minimal satu item group.", "error");
      return;
    }

    try {
      if (isEdit) {
        // Format payload untuk UPDATE
        const payload = {
          no_sj_ex: form().no_sj_ex,
          no_sj_supplier: form().no_sj_supplier.trim(),
          po_ex_id: form().purchase_order_id,
          tanggal_kirim: form().tanggal_kirim,
          keterangan: form().keterangan,
          items: form()
            .itemGroups.filter(
              (g) =>
                (form().unit === "Meter" ? g.meter_total : g.yard_total) > 0
            )
            .map((g) => ({
              id: g.id, // Untuk update
              po_ex_item_id: Number(g.purchase_order_item_id),
              meter_total: Number(g.meter_total) || 0,
              yard_total: Number(g.yard_total) || 0,
              gulung: Number(g.gulung) || 0,
              lot: Number(g.lot) || 0,
              sj_item_selected_status: 0,
            })),
          deleted_items: deletedItems(),
        };

        await updateSJOCX(user?.token, params.id, payload);
      } else {
        // Format payload untuk CREATE
        const payload = {
          no_sj_ex: form().no_sj_ex,
          no_sj_supplier: form().no_sj_supplier.trim(),
          po_ex_id: form().purchase_order_id,
          tanggal_kirim: form().tanggal_kirim,
          keterangan: form().keterangan,
          items: form()
            .itemGroups.filter(
              (g) =>
                (form().unit === "Meter" ? g.meter_total : g.yard_total) > 0
            )
            .map((g) => ({
              po_ex_item_id: Number(g.purchase_order_item_id),
              meter_total: Number(g.meter_total) || 0,
              yard_total: Number(g.yard_total) || 0,
              gulung: Number(g.gulung) || 0,
              lot: Number(g.lot) || 0,
              sj_item_selected_status: 0,
            })),
        };

        await createSJOCX(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil Update Surat Penerimaan OCX" : "Berhasil Simpan Surat Penerimaan OCX",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/sjocx");
      });
    } catch (error) {
      console.error("Error submitting:", error);
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

  function handlePrint() {
    if (!deliveryNoteData()) {
      Swal.fire(
        "Gagal",
        "Data untuk mencetak tidak tersedia. Pastikan Anda dalam mode Edit/View.",
        "error"
      );
      return;
    }

    const dataToPrint = { ...deliveryNoteData() };
    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/sjocx#${encodedData}`, "_blank");
  }

  return (
    <MainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
      <h1 class="text-2xl font-bold mb-4">
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Surat Penerimaan OCX
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

      <form class="space-y-4" onSubmit={handleSubmit} onkeydown={handleKeyDown}>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm mb-1">No Surat Penerimaan</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().no_sj_ex}
                readOnly
              />
            </div>
          </div>
          <div>
            <label class="block text-sm mb-1">No Surat Jalan Supplier</label>
            <input
              class="w-full border p-2 rounded"
              value={form().no_sj_supplier}
              onInput={(e) =>
                setForm({ ...form(), no_sj_supplier: e.target.value })
              }
              required
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>
          <div>
            <label class="block text-sm mb-1">Alamat Pengiriman</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().alamat_pengiriman}
                readOnly
              />
            </div>
          </div>
          <div>
            <label class="block text-sm mb-1">Tanggal Pengiriman</label>
            <div class="flex gap-2">
              <input
                type="date"
                class="w-full border p-2 rounded"
                value={form().tanggal_kirim}
                onInput={(e) =>
                  setForm({ ...form(), tanggal_kirim: e.target.value })
                }
                disabled={isView}
                classList={{ "bg-gray-200": isView }}
              />
            </div>
          </div>
          <div>
            <label class="block text-sm mb-1">OCX</label>
            <OCXDropdownSearch
              items={orderCelupList()}
              value={form().purchase_order_id}
              form={form}
              setForm={setForm}
              onChange={handleSuratJalanChange}
              disabled={isView || isEdit}
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

        <Show
          when={form().purchase_order_items && form().itemGroups.length > 0}
        >
          <div class="border p-3 rounded my-4 bg-gray-50">
            <h3 class="text-md font-bold mb-2 text-gray-700">
              Quantity Kain PO:
            </h3>
            <ul class="space-y-1 pl-5">
              <For each={form().purchase_order_items.items}>
                {(item) => {
                  const sisa =
                    form().unit === "Meter"
                      ? Number(item.meter_total) -
                        Number(item.meter_dalam_proses || 0)
                      : Number(item.yard_total) -
                        Number(item.yard_dalam_proses || 0);

                  return (
                    <li class="text-sm list-disc">
                      <span class="font-semibold">
                        {item.corak_kain} | {item.konstruksi_kain}
                      </span>{" "}
                      - Quantity:
                      {sisa > 0 ? (
                        <span class="font-bold text-blue-600">
                          {formatNumber(sisa)}{" "}
                          {form().unit === "Meter" ? "m" : "yd"}
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
          <h2 class="text-lg font-bold mt-6 mb-2">Items</h2>
          <button
            type="button"
            onClick={() => addItemGroup()}
            class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
            hidden
          >
            + Tambah Item
          </button>
          <table class="w-full text-sm border border-gray-300 mb-4">
            <thead class="bg-gray-100">
              <tr>
                <th class="border p-2 w-10">#</th>
                <th class="border p-2">Jenis Kain</th>
                <th class="border p-2">Warna</th>
                <th class="border p-2">Lebar Greige</th>
                <th class="border p-2">Lebar Finish</th>
                <th class="border p-2 w-40">{form().unit}</th>
                <th class="border p-2 w-32">Gulung</th>
                <th class="border p-2 w-32">Lot</th>
                <th hidden class="border p-2 w-48">
                  Harga
                </th>
                <th hidden class="border p-2 w-48">
                  Subtotal
                </th>
                <th class="border p-2 w-48">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <Show when={form().itemGroups.length > 0}>
                <For each={form().itemGroups}>
                  {(group, i) => {
                    const quantity =
                      form().unit === "Meter"
                        ? group.meter_total
                        : group.yard_total;
                    const subtotal =
                      (group.item_details?.harga || 0) * quantity;

                    return (
                      <tr>
                        <td class="border p-2 text-center">{i() + 1}</td>
                        <td class="border w-108 p-2">
                          <input
                            class="border p-1 rounded w-full bg-gray-200"
                            value={`${group.item_details?.corak_kain || ""} | ${
                              group.item_details?.konstruksi_kain || ""
                            }`}
                            disabled
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            class="border p-1 rounded w-full bg-gray-200"
                            value={group.item_details?.deskripsi_warna}
                            disabled={true}
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            type="number"
                            class="border p-1 rounded w-full bg-gray-200"
                            value={group.item_details?.lebar_greige}
                            disabled={true}
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            type="number"
                            class="border p-1 rounded w-full bg-gray-200"
                            value={group.item_details?.lebar_finish}
                            disabled={true}
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            type="text"
                            class="w-full border p-2 rounded text-right"
                            value={formatNumber(quantity)}
                            onBlur={(e) =>
                              handleQuantityChange(i(), e.target.value)
                            }
                            disabled={isView}
                            classList={{ "bg-gray-200": isView }}
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            type="number"
                            placeholder="Banyak gulung..."
                            class="w-full border p-2 rounded text-right"
                            value={group.gulung ?? 0}
                            onBlur={(e) =>
                              handleGulungChange(i(), e.target.value)
                            }
                            disabled={isView}
                            classList={{ "bg-gray-200": isView }}
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            type="number"
                            placeholder="Input lot..."
                            class="w-full border p-2 rounded text-right"
                            value={group.lot ?? 0}
                            onBlur={(e) => handleLotChange(i(), e.target.value)}
                            disabled={isView}
                            classList={{ "bg-gray-200": isView }}
                          />
                        </td>
                        <td hidden class="border p-2 text-right">
                          <input
                            class="w-full border p-2 rounded text-right"
                            value={formatHarga(group.item_details?.harga)}
                            disabled={true}
                            classList={{ "bg-gray-200": true }}
                          />
                        </td>
                        <td hidden class="border p-2 text-right font-semibold">
                          <input
                            class="w-full border p-2 rounded text-right"
                            value={formatHarga(subtotal)}
                            disabled={true}
                            classList={{ "bg-gray-200": true }}
                          />
                        </td>
                        <td class="border p-2 text-center">
                          <button
                            type="button"
                            class="text-red-600 hover:text-red-800 disabled:cursor-not-allowed"
                            onClick={() => removeItem(i())}
                            disabled={isView}
                          >
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </Show>
            </tbody>
            <tfoot>
              <tr class="font-bold bg-gray-100">
                <td colSpan="5" class="text-right p-2 border-t border-gray-300">
                  TOTAL
                </td>
                <td class="border p-2 text-right">
                  {form().unit === "Meter"
                    ? formatNumber(totalMeter(), 2)
                    : formatNumber(totalYard(), 2)}
                </td>
                <td hidden class="border p-2 text-right">
                  {formatIDR(totalAll())}
                </td>
                <td hidden class="border-t border-gray-300"></td>
              </tr>
            </tfoot>
          </table>
        </div>

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
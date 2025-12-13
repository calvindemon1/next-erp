import {
  createSignal,
  createEffect,
  onMount,
  For,
  Show,
  createMemo,
} from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getAllOrderMatching,
  getOrderMatching,
  createOrderMatching,
  updateOrderMatching,
  getAllSuppliers,
  getAllFabrics,
  getAllColors,
  getAllUsers,
  getUser,
} from "../../utils/auth";
import { Plus, Printer, Trash2 } from "lucide-solid";
import SupplierDropdownSearch from "../../components/SupplierDropdownSearch";
import MemoFabricDropdownSearch from "../../components/MemoFabricDropdownSearch";
import MemoColorDropdownSearch from "../../components/MemoColorDropdownSearch";

export default function MemoOrderMatchingForm() {
  const navigate = useNavigate();
  const user = getUser();
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === "true";

  const [loading, setLoading] = createSignal(false);
  const [suppliers, setSuppliers] = createSignal([]);
  const [fabrics, setFabrics] = createSignal([]);
  const [warnas, setWarnas] = createSignal([]);
  const [marketings, setMarketings] = createSignal([]);
  const [lastList, setLastList] = createSignal([]);
  const [momStatus, setMomStatus] = createSignal(null);

  const [printData, setPrintData] = createSignal([]);

  const [form, setForm] = createSignal({
    no_om: "",
    supplier_id: "",
    kain_id: "",
    warna_items: [], // ✅ SATU-SATUNYA
    marketing_id: "",
    tanggal: "",
    keterangan_order_matching: "",
  });

  // Helper: format next 3-digit no_om
  function formatNoOm(num) {
    return String(num).padStart(3, "0");
  }

  // Generate next no_om from list (fallback)
  const generateNextFromList = (list) => {
    if (!Array.isArray(list) || list.length === 0) return formatNoOm(1);
    // find max numeric no_om
    let max = 0;
    list.forEach((it) => {
      const raw = String(it.no_om || "").replace(/^0+/, "") || "0";
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return formatNoOm(max + 1);
  };

  // Format tanggal : YYYY-MM-DD
  const todayISO = () => new Date().toISOString().split("T")[0];

  onMount(async () => {
    setLoading(true);
    try {
      // parallel fetch dropdowns + existing MOM list
      const [listOrderMatching, supRes, kainRes, warnaRes, marketingRes] =
        await Promise.all([
          getAllOrderMatching(user?.token),
          getAllSuppliers(user?.token),
          getAllFabrics(user?.token),
          getAllColors(user?.token),
          getAllUsers(user?.token),
        ]);

      // assume getAllOrderMatching returns { status, data }
      const orders = listOrderMatching?.data || [];
      setLastList(orders);

      setSuppliers(supRes?.suppliers || []);
      const kainList = kainRes?.kain || kainRes?.data || [];
      const warnaList = warnaRes?.data || warnaRes?.warna || [];

      setFabrics(kainList);
      setWarnas(warnaList);

      setMarketings(marketingRes?.data || marketingRes?.users || []);

      if (isEdit) {
        // fetch single
        const res = await getOrderMatching(params.id, user?.token);

        setPrintData(res);
        // const data = res?.order_matching || res?.data || res?.order || null;
        let data =
          res?.order_matching ||
          res?.order ||
          (Array.isArray(res?.data) ? res.data[0] : res?.data) ||
          null;
        if (!data) {
          Swal.fire({
            icon: "error",
            title: "Data tidak ditemukan",
            text: "Tidak dapat mengambil data Memo Order Matching.",
          });
          navigate("/memo-order-matching");
          return;
        }

        setMomStatus(data.status ?? 0);

        // parse warna_ids string -> array
        let parsedWarnaIds = [];

        try {
          parsedWarnaIds = Array.isArray(data.warna_ids)
            ? data.warna_ids
            : JSON.parse(data.warna_ids || "[]");
        } catch (e) {
          parsedWarnaIds = [];
        }

        setForm({
          no_om: data.no_om || "",
          supplier_id: data.supplier_id ?? "",
          kain_id: data.kain_id ?? "",
          warna_items: parsedWarnaIds.map((id) => ({ warna_id: id })),
          marketing_id: data.marketing_id ?? "",
          tanggal: data.tanggal
            ? new Date(data.tanggal).toISOString().split("T")[0]
            : new Date(data.created_at).toISOString().split("T")[0],
          keterangan_order_matching: data.keterangan_order_matching ?? "",
        });

        // pastikan kain ada di options
        if (data.warna_id && !warnaList.some((w) => w.id === data.warna_id)) {
          setWarnas((prev) => [
            ...prev,
            {
              id: data.warna_id,
              kode: data.kode_warna_ex,
              deskripsi: data.deskripsi_warna_ex,
            },
          ]);
        }

        // pastikan warna ada di options
        if (data.warna_id && !warnas().some((w) => w.id === data.warna_id)) {
          setWarnas((prev) => [
            ...prev,
            {
              id: data.warna_id,
              kode: data.kode_warna_ex,
              deskripsi: data.deskripsi_warna_ex,
            },
          ]);
        }
      } else {
        // create mode: auto generate no_om from list
        const next = generateNextFromList(orders);
        setForm((prev) => ({
          ...prev,
          no_om: next,
          tanggal: todayISO(),
        }));
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal memuat data",
        text: err?.message || "Terjadi kesalahan saat memuat data.",
      });
    } finally {
      setLoading(false);
    }
  });

  // manual generate (button)
  const handleGenerate = async () => {
    setLoading(true);
    try {
      // refresh list then generate next
      const res = await getAllOrderMatching(user?.token);
      const orders = res?.data || [];
      setLastList(orders);
      const next = generateNextFromList(orders);
      setForm((prev) => ({ ...prev, no_om: next }));
      Swal.fire({
        icon: "success",
        title: "No OM digenerate",
        text: next,
        timer: 900,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal generate",
        text: err?.message || "Gagal generate nomor.",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!form().no_om) {
      Swal.fire({ icon: "warning", title: "No OM kosong" });
      return false;
    }

    if (!form().supplier_id) {
      Swal.fire({ icon: "warning", title: "Pilih supplier" });
      return false;
    }

    if (!form().kain_id) {
      Swal.fire({ icon: "warning", title: "Pilih kain" });
      return false;
    }

    if (!form().marketing_id) {
      Swal.fire({ icon: "warning", title: "Pilih marketing" });
      return false;
    }

    // ✅ VALIDASI WARNA YANG BENAR
    if (!form().warna_items.length) {
      Swal.fire({
        icon: "warning",
        title: "Tambah minimal 1 warna",
      });
      return false;
    }

    if (form().warna_items.some((w) => !w.warna_id)) {
      Swal.fire({
        icon: "warning",
        title: "Ada warna yang belum dipilih",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        no_om: form().no_om,
        supplier_id: Number(form().supplier_id),
        kain_id: Number(form().kain_id),
        warna_ids: form().warna_items.map((w) => w.warna_id),
        marketing_id: Number(form().marketing_id),
        tanggal: form().tanggal,
        keterangan_order_matching: form().keterangan_order_matching || "",
      };

      if (isEdit) {
        // update endpoint expects payload (backend design earlier)
        await updateOrderMatching(user?.token, { id: params.id, ...payload });
      } else {
        await createOrderMatching(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil update MOM" : "Berhasil membuat MOM",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });

      navigate("/memo-order-matching");
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan MOM",
        text: err?.message || "Terjadi kesalahan.",
      });
    } finally {
      setLoading(false);
    }
  };

  const addWarnaItem = () => {
    setForm((prev) => ({
      ...prev,
      warna_items: [...prev.warna_items, { warna_id: null }],
    }));
  };

  const removeWarnaItem = (index) => {
    setForm((prev) => ({
      ...prev,
      warna_items: prev.warna_items.filter((_, i) => i !== index),
    }));
  };

  const updateWarnaItem = (index, warnaId) => {
    setForm((prev) => {
      const items = [...prev.warna_items];
      items[index] = { warna_id: warnaId };
      return { ...prev, warna_items: items };
    });
  };

  function handlePrint(list) {
    // Use existing data (if edit/view) or current form as fallback
    const dataToPrint = {
      printed_at: new Date().toISOString(),
      total: list.length,
      data: list,
    };

    const encoded = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/detail-order-matching#${encoded}`, "_blank");
  }

  return (
    <MainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md z-50 gap-10">
          <div class="w-44 h-44 border-[18px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[36px] text-white">Loading...</span>
        </div>
      )}

      <h1 class="text-2xl font-bold mb-4 flex items-center gap-3">
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Memo Order Matching
        <Show when={isEdit || isView}>
          <span
            class={
              momStatus() === 0
                ? "inline-flex items-center px-5 py-1 rounded-full text-xl font-semibold uppercase tracking-wide bg-blue-100 text-blue-700 border-2"
                : "inline-flex items-center px-5 py-1 rounded-full text-xl font-semibold uppercase tracking-wide bg-green-100 text-green-700 border-2"
            }
          >
            {momStatus() === 0 ? "ACTIVE" : "DONE"}
          </span>
        </Show>
      </h1>

      <div class="flex gap-2 mb-4">
        <button
          type="button"
          class="flex gap-2 items-center bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/memo-order-matching")}
        >
          Kembali
        </button>

        <button
          type="button"
          class="flex gap-2 items-center bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          onClick={() => handlePrint(printData())}
          hidden={!isEdit && !isView}
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        class="space-y-4"
        onkeydown={(e) => e.key === "Enter" && e.preventDefault()}
      >
        <div class="grid grid-cols-5 gap-4">
          <div>
            <label class="block mb-1 font-medium">No OM</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-100 p-2 rounded"
                value={form().no_om}
                readOnly
              />
              <button
                type="button"
                class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400"
                onClick={handleGenerate}
                disabled={isView || isEdit}
                classList={{
                  "opacity-50 cursor-not-allowed": isView || isEdit,
                }}
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label class="block mb-1 font-medium">Tanggal</label>
            <input
              type="date"
              class="w-full border bg-gray-200 p-2 rounded"
              value={form().tanggal}
              readOnly
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Supplier</label>
            {/* <select
              class="w-full border p-2 rounded"
              value={form().supplier_id || ""}
              onChange={(e) =>
                setForm({ ...form(), supplier_id: e.target.value })
              }
              disabled={isView}
              required
            >
              <option value="">Pilih Supplier</option>
              <For each={suppliers()}>
                {(s) => (
                  <option value={s.id}>
                    {s.name ?? s.nama ?? s.company ?? s.label}
                  </option>
                )}
              </For>
            </select> */}
            <SupplierDropdownSearch
              suppliers={suppliers}
              form={form}
              setForm={setForm}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Kain</label>
            {/* <select
              class="w-full border p-2 rounded"
              value={form().kain_id || ""}
              onChange={(e) => setForm({ ...form(), kain_id: e.target.value })}
              disabled={isView}
              required
            >
              <option value="">Pilih Kain</option>
              <For each={fabrics()}>
                {(f) => (
                  <option value={f.id}>{f.corak + " - " + f.konstruksi}</option>
                )}
              </For>
            </select> */}
            <MemoFabricDropdownSearch
              fabrics={fabrics}
              value={() => Number(form().kain_id)}
              onChange={(id) => setForm({ ...form(), kain_id: id })}
              disabled={isView}
            />
          </div>

          {/* <div>
            <label class="block mb-1 font-medium">Warna</label>
            <select
              class="w-full border p-2 rounded"
              value={form().warna_id || ""}
              onChange={(e) => setForm({ ...form(), warna_id: e.target.value })}
              disabled={isView}
              required
            >
              <option value="">Pilih Warna</option>
              <For each={warnas()}>
                {(w) => (
                  <option value={w.id}>{w.kode + " - " + w.deskripsi}</option>
                )}
              </For>
            </select>

            <MemoColorDropdownSearch
              colors={warnas}
              value={() => ""}
              onChange={(id) => addWarna(id)}
              disabled={isView}
            />
            <Show when={form().warna_ids.length > 0}>
              <div class="mt-2 space-y-1">
                <For each={form().warna_ids}>
                  {(warnaId) => {
                    const warna = warnas().find((w) => w.id === warnaId);
                    return (
                      <div class="flex items-center justify-between bg-gray-100 px-3 py-1 rounded">
                        <span class="text-sm">
                          {warna?.kode} - {warna?.deskripsi}
                        </span>

                        <button
                          type="button"
                          class="text-red-600 text-xs hover:underline"
                          onClick={() => removeWarna(warnaId)}
                          disabled={isView}
                        >
                          Hapus
                        </button>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div> */}

          <div>
            <label class="block mb-1 font-medium">Marketing</label>
            <select
              class="w-full border p-2 rounded"
              value={form().marketing_id || ""}
              onChange={(e) =>
                setForm({ ...form(), marketing_id: e.target.value })
              }
              disabled={isView}
              required
            >
              <option value="">Pilih User (Marketing)</option>
              <For each={marketings()}>
                {(m) => <option value={m.id}>{m.name}</option>}
              </For>
            </select>
          </div>
        </div>

        <div>
          <label class="block mb-1 font-medium">Keterangan (opsional)</label>
          <textarea
            class="w-full border p-2 rounded"
            value={form().keterangan_order_matching}
            onInput={(e) =>
              setForm({ ...form(), keterangan_order_matching: e.target.value })
            }
            readOnly={isView}
          />
        </div>

        <div>
          <label class="block mb-1 font-medium">Warna</label>

          <button
            type="button"
            class="flex items-center gap-3 mb-2 bg-blue-500 text-white px-3 py-1 rounded text-sm"
            onClick={addWarnaItem}
            disabled={isView}
          >
            <Plus size={15} /> Tambah Warna
          </button>

          <div class="space-y-2">
            <For each={form().warna_items}>
              {(item, index) => (
                <div class="flex gap-2 items-center">
                  <MemoColorDropdownSearch
                    colors={warnas}
                    value={() => item.warna_id}
                    onChange={(id) => updateWarnaItem(index(), id)}
                    disabled={isView}
                  />

                  <button
                    type="button"
                    class="text-red-600 text-sm hover:underline"
                    onClick={() => removeWarnaItem(index())}
                    disabled={isView}
                  >
                    <Trash2 size={25} />
                  </button>
                </div>
              )}
            </For>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="submit"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={isView}
            hidden={isView}
          >
            {isEdit ? "Update" : "Simpan"}
          </button>

          <button
            type="button"
            class="bg-gray-200 px-3 py-2 rounded"
            onClick={() => navigate("/memo-order-matching")}
          >
            Batal
          </button>
        </div>
      </form>
    </MainLayout>
  );
}

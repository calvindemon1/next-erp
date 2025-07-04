import { createSignal, For, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  createSalesOrder,
  getAllCurrenciess,
  getAllCustomers,
  getAllSalesContracts,
  getSalesOrders,
  getUser,
  updateDataSalesOrder,
} from "../../utils/auth";
import SearchableSalesContractSelect from "../../components/SalesContractDropdownSearch";
import { produce } from "solid-js/store";
import { Trash2 } from "lucide-solid";
// import { createSC, updateSC, getSC } from "../../utils/auth";
// --> ganti sesuai endpoint lu

export default function SalesOrderForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();
  const [salesContracts, setSalesContracts] = createSignal([]);
  const [jenisSoList, setJenisSoList] = createSignal([
    { jenis_so_id: null, name: "" },
    { jenis_so_id: 1, name: "Domestik" },
    { jenis_so_id: 2, name: "Ekspor" },
  ]);

  const [form, setForm] = createSignal({
    no_so: "",
    sales_contract_id: "",
    tanggal: "",
    delivery_date: "",
    komisi: "",
    catatan: "",
    items: [],
  });

  onMount(async () => {
    const getSalesContracts = await getAllSalesContracts(user?.token);
    setSalesContracts(getSalesContracts.contracts);

    if (isEdit) {
      const res = await getSalesOrders(params.id, user?.token);
      const salesContracts = res.response; // karena dari console lu, response-nya di dalam `response`

      // Safety check
      if (!salesContracts) return;

      // Normalize items
      const normalizedItems = (salesContracts.items || []).map((item, idx) => ({
        id: idx + 1,

        sales_contract_item_id: item.sales_contract_id ?? null,
        keterangan: item.keterangan ?? "",
        grade: item.grade ?? "",
        lebar: item.lebar ? parseFloat(item.lebar) : null,
        gramasi: item.gramasi ? parseFloat(item.gramasi) : null,
        meter: item.meter ? parseFloat(item.meter) : null,
        yard: item.yard ? parseFloat(item.yard) : null,
        kilogram: item.kilogram ? parseFloat(item.kilogram) : null,
        harga: item.harga ? parseFloat(item.harga) : null,
      }));

      // Set form
      setForm({
        no_so: salesContracts.no_so ?? "",
        sales_contract_id: salesContracts.sales_contract_id ?? "",
        tanggal: salesContracts.tanggal?.split("T")[0] ?? "",
        delivery_date: salesContracts.delivery_date?.split("T")[0] ?? "",
        komisi: parseFloat(salesContracts.komisi) ?? "",
        catatan: salesContracts.termin ?? "",
        items: normalizedItems.length > 0 ? normalizedItems : [],
      });

      // console.log("🚀 FORM DATA:", {
      //   ...salesContracts,
      //   items: normalizedItems,
      // });
    }
  });

  const formatIDR = (val) => {
    if (val === null || val === "") return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const parseIDR = (str) => {
    if (!str) return "";
    const onlyNumbers = str.replace(/[^\d]/g, "");
    return onlyNumbers ? parseInt(onlyNumbers) : "";
  };

  const reindexItems = (items) =>
    items.map((item, i) => ({
      ...item,
      id: i + 1,
    }));

  const addItem = () => {
    setForm((prev) => {
      const newItems = [
        ...prev.items,
        {
          id: 0, // temporary
          sales_contract_item_id: null,
          keterangan: "",
          grade: "",
          lebar: null,
          gramasi: null,
          meter: null,
          yard: null,
          kilogram: null,
          harga: null,
        },
      ];

      return {
        ...prev,
        items: reindexItems(newItems),
      };
    });
  };

  const removeItem = (index) => {
    setForm((prev) => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return {
        ...prev,
        items: reindexItems(newItems),
      };
    });
  };

  const handleItemChange = (index, field, value) => {
    const numericFields = [
      "sales_contract_id",
      "lebar",
      "gramasi",
      "meter",
      "yard",
      "kilogram",
      "harga",
    ];

    let processedValue = value;
    if (numericFields.includes(field)) {
      processedValue = value === "" ? null : parseFloat(value);
    }

    setForm(
      produce((f) => {
        f.items[index][field] = processedValue;
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const toNum = (val) =>
        val === "" || val === null || val === undefined
          ? null
          : parseFloat(val);

      const payload = {
        ...form(),
        no_so: form().no_so,
        sales_contract_id: parseInt(form().sales_contract_id),
        jenis_so_id: parseInt(form().jenis_so_id),
        tanggal: form().tanggal,
        delivery_date: form().delivery_date,
        komisi: toNum(form().komisi),
        catatan: form().catatan,
        items: form().items.map((item) => ({
          id: item.id,
          sales_contract_item_id: toNum(item.sales_contract_item_id),
          keterangan: item.keterangan || "",
          grade: item.grade || "",
          lebar: toNum(item.lebar),
          gramasi: toNum(item.gramasi),
          meter: toNum(item.meter),
          yard: toNum(item.yard),
          kilogram: toNum(item.kilogram),
          harga: toNum(item.harga),
        })),
      };

      if (isEdit) {
        await updateDataSalesOrder(user?.token, params.id, payload);
      } else {
        await createSalesOrder(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengupdate Sales Contract"
          : "Berhasil membuat Sales Contract baru",
        confirmButtonColor: "#6496df",
      }).then(() => navigate("/salesorder"));
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: isEdit
          ? "Gagal mengupdate Sales Contract"
          : "Gagal membuat Sales Contract baru",
        confirmButtonColor: "#6496df",
      });
    }
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Sales Order
      </h1>

      <form class="flex flex-col space-y-4 " onSubmit={handleSubmit}>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-medium">No Sales Order</label>
            <input
              class="w-full border p-2 rounded"
              value={form().no_so}
              onInput={(e) => setForm({ ...form(), no_so: e.target.value })}
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Sales Contract</label>
            <SearchableSalesContractSelect
              salesContracts={salesContracts}
              form={form}
              setForm={setForm}
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Jenis Sales Order</label>
            <select
              class="w-full border p-2 rounded"
              value={form().jenis_so_id ?? ""}
              onChange={(e) =>
                setForm({ ...form(), jenis_so_id: e.target.value })
              }
              required
            >
              <option value="" disabled hidden={!!form().jenis_so_id}>
                Pilih Jenis Sales Order
              </option>
              {jenisSoList().map((curr) => (
                <option value={curr.jenis_so_id}>{curr.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium">Tanggal</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal}
              onInput={(e) => setForm({ ...form(), tanggal: e.target.value })}
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Tanggal Pengiriman</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().delivery_date}
              onInput={(e) =>
                setForm({ ...form(), delivery_date: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Komisi</label>
            <div class="flex">
              <span class="inline-flex items-center px-3 border border-r-0 border-black bg-gray-50 rounded-l">
                IDR
              </span>
              <input
                type="text"
                class="w-full border p-2 rounded rounded-l-none"
                value={formatIDR(form().komisi)}
                onInput={(e) =>
                  setForm({
                    ...form(),
                    komisi: parseIDR(e.target.value),
                  })
                }
                required
              />
            </div>
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium">Catatan</label>
          <textarea
            class="w-full border p-2 rounded"
            value={form().catatan}
            onInput={(e) => setForm({ ...form(), catatan: e.target.value })}
            required
          ></textarea>
        </div>

        {/* ITEMS */}
        <h2 class="text-lg font-bold mt-6 mb-2">Items</h2>
        <For each={form().items}>
          {(item, index) => {
            const i = index(); // pastikan index dipanggil sebagai function

            return (
              <div class="border p-4 rounded mb-4 bg-gray-200" key={item.id}>
                <div class="flex justify-between mb-2">
                  <span class="font-semibold">Item {i + 1}</span>
                  <button
                    type="button"
                    class="text-red-600 hover:text-red-800 text-sm"
                    onClick={() => removeItem(i)}
                  >
                    <Trash2 size={22} />
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: "Sales Contract Item ID",
                      field: "sales_contract_item_id",
                      type: "number",
                    },
                    { label: "Keterangan", field: "keterangan", type: "text" },
                    { label: "Grade", field: "grade", type: "text" },
                    {
                      label: "Lebar",
                      field: "lebar",
                      type: "number",
                      step: "0.01",
                    },
                    {
                      label: "Gramasi",
                      field: "gramasi",
                      type: "number",
                      step: "0.01",
                    },
                    {
                      label: "Meter",
                      field: "meter",
                      type: "number",
                      step: "0.01",
                    },
                    {
                      label: "Yard",
                      field: "yard",
                      type: "number",
                      step: "0.01",
                    },
                    {
                      label: "Kilogram",
                      field: "kilogram",
                      type: "number",
                      step: "0.01",
                    },
                    { label: "Harga", field: "harga", type: "number" },
                  ].map(({ label, field, type, step }) => (
                    <div>
                      <label
                        class="block mb-1 text-sm text-gray-700"
                        for={`item-${item.id}-${field}`}
                      >
                        {label}
                      </label>
                      <input
                        placeholder={label}
                        type="text"
                        step={step}
                        class="border p-2 rounded w-full"
                        value={
                          field === "harga"
                            ? formatIDR(item[field])
                            : item[field] ?? ""
                        }
                        onInput={(e) =>
                          handleItemChange(
                            i,
                            field,
                            field === "harga"
                              ? parseIDR(e.target.value)
                              : e.target.value
                          )
                        }
                        name={`item-${item.id}-${field}`}
                        id={`item-${item.id}-${field}`}
                        required={
                          ["keterangan", "status", "grade"].includes(field) ||
                          type === "number"
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          }}
        </For>

        <button
          type="button"
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
          onClick={addItem}
        >
          + Tambah Item
        </button>

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

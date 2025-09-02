import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { Banks, User } from "../../../utils/financeAuth";
import Swal from "sweetalert2";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

export default function BanksForm() {
  const [form, setForm] = createSignal({
    id: "",
    kode: "",
    nama: "",
  });
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = User.getUser();

  onMount(async () => {
    if (isEdit) {
      const bankData = await Banks.getById(params.id, user?.token);
      setForm({
        id: params.id,
        kode: bankData.bank.kode,
        nama: bankData.bank.nama,
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await Banks.create(user?.token, params.id, form().kode, form().nama);
      } else {
        await Banks.update(user?.token, form().kode, form().nama);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengubah data bank"
          : "Berhasil membuat bank baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/banks"));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: isEdit
          ? "Gagal mengubah data bank"
          : "Gagal membuat data bank baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  return (
    <FinanceMainLayout>
      <h1 class="text-2xl font-bold mb-4">{isEdit ? "Edit" : "Tambah"} Bank</h1>
      <form class="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium">Kode</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().kode}
              onInput={(e) => setForm({ ...form(), kode: e.target.value })}
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Nama Bank</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().nama}
              onInput={(e) => setForm({ ...form(), nama: e.target.value })}
              required
            />
          </div>
        </div>
        <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Simpan
        </button>
      </form>
    </FinanceMainLayout>
  );
}

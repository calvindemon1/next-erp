import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { JenisHutang, User } from "../../../utils/financeAuth";
import Swal from "sweetalert2";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

export default function JenisHutangForm() {
  const [form, setForm] = createSignal({
    id: "",
    name: "",
  });
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();

  onMount(async () => {
    if (isEdit) {
      const jenisHutangData = await JenisHutang.getById(params.id);
      setForm({
        id: params.id,
        name: jenisHutangData.data.name,
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!isEdit) {
        await JenisHutang.create({ name: form().name });
      } else {
        await JenisHutang.update(params.id, { name: form().name });
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengubah data jenis hutang"
          : "Berhasil membuat jenis hutang baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/jenis-hutang"));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: isEdit
          ? "Gagal mengubah data jenis hutang"
          : "Gagal membuat data jenis hutang baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  return (
    <FinanceMainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Jenis Hutang
      </h1>
      <form class="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium">Nama Jenis Hutang</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().name}
              onInput={(e) => setForm({ ...form(), name: e.target.value })}
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

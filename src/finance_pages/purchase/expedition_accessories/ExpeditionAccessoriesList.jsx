import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { PurchaseAksesorisEkspedisi, User } from "../../../utils/financeAuth";
import Swal from "sweetalert2";
import { Edit, Trash, Eye } from "lucide-solid";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

export default function ExpeditionAccessoriesList() {
  const [expeditionAccessories, setExpeditionAccessories] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = User.getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(expeditionAccessories().length / pageSize))
  );

  const paginatedData = createMemo(() => {
    const startIndex = (currentPage() - 1) * pageSize;
    return expeditionAccessories().slice(startIndex, startIndex + pageSize);
  });

  function formatTanggal(tanggalString) {
    const tanggal = new Date(tanggalString);
    const bulanIndo = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const tanggalNum = tanggal.getDate();
    const bulan = bulanIndo[tanggal.getMonth()];
    const tahun = tanggal.getFullYear();

    return `${tanggalNum} ${bulan} ${tahun}`;
  }

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus data aksesoris ekspedisi?",
      text: `Apakah kamu yakin ingin menghapus data aksesoris ekspedisi dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await PurchaseAksesorisEkspedisi.delete(id);

      await Swal.fire({
        title: "Terhapus!",
        text: `Data aksesoris ekspedisi dengan ID ${id} berhasil dihapus.`,
        icon: "success",
        confirmButtonColor: "#6496df",
      });

      const filtered = expeditionAccessories().filter((s) => s.id !== id);
      setExpeditionAccessories(filtered);

      if (currentPage() > Math.max(1, Math.ceil(filtered.length / pageSize))) {
        setCurrentPage(Math.max(1, Math.ceil(filtered.length / pageSize)));
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Gagal",
        text:
          error?.message ||
          `Gagal menghapus data aksesoris ekspedisi dengan ID ${id}`,
        icon: "error",
        showConfirmButton: false,
        timer: 1200,
        timerProgressBar: true,
      });
    }
  };

  const handleGetAllExpeditionAccessories = async () => {
    try {
      const res = await PurchaseAksesorisEkspedisi.getAll();
      if (res?.status === 200) {
        const sortedData = (res.data || res).slice().sort((a, b) => b.id - a.id);
        setExpeditionAccessories(sortedData);
        setCurrentPage(1);
      } else {
        const data = res?.data ?? res ?? [];
        setExpeditionAccessories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Gagal ambil data aksesoris ekspedisi:", err);
      setExpeditionAccessories([]);
    }
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllExpeditionAccessories();
    }
  });

  const goPrev = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };
  const goNext = () => {
    setCurrentPage((p) => Math.min(totalPages(), p + 1));
  };

  return (
    <FinanceMainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Pembelian Aksesoris Ekspedisi</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/expedition-accessories/form")}
        >
          + Pembelian Aksesoris Ekspedisi
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">No</th>
              <th class="py-2 px-2">No Pembelian</th>
              <th class="py-2 px-2">No SJ Supplier</th>
              <th class="py-2 px-2">Tanggal SJ</th>
              <th class="py-2 px-2">Supplier</th>
              <th class="py-2 px-2">Tanggal Jatuh Tempo</th>
              <th class="py-2 px-2 text-right">Kuantitas Jenis Barang</th>
              <th class="py-2 px-2 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((ea, index) => (
              <tr class="border-b" key={ea.id}>
                <td class="py-2 px-4">{(currentPage() - 1) * pageSize + (index + 1)}</td>
                <td class="py-2 px-4">{ea.no_pembelian ?? ea.sequence_number ?? "-"}</td>
                <td class="py-2 px-4">{ea.no_sj_supplier ?? "-"}</td> 
                <td class="py-2 px-4">{formatTanggal(ea.tanggal_sj ?? "-")}</td>
                <td class="py-2 px-4">{ea.supplier_name ?? ea.supplier_kode ?? "-"}</td>
                <td class="py-2 px-4">{formatTanggal(ea.tanggal_jatuh_tempo ?? "-")}</td>
                <td class="py-2 px-4 text-right">
                  {ea.summary?.kuantitas_jenis_barang ?? ea.summary?.kuantitas ?? "-"}
                </td>

                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-yellow-600 hover:underline mr-2"
                    onClick={() =>
                      navigate(`/expedition-accessories/form?id=${ea.id}&view=true`)
                    }
                    title="View"
                  >
                    <Eye size={25} />
                  </button>

                  <button
                    class="text-blue-600 hover:underline mr-2"
                    onClick={() =>
                      navigate(`/expedition-accessories/form?id=${ea.id}`)
                    }
                    title="Edit"
                  >
                    <Edit size={25} />
                  </button>

                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(ea.id)}
                    title="Delete"
                  >
                    <Trash size={25} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div class="w-full mt-8 flex justify-between items-center space-x-2">
          <button
            class="px-3 py-1 bg-gray-200 rounded min-w-[80px]"
            onClick={goPrev}
            disabled={currentPage() === 1}
          >
            Prev
          </button>

          <div class="text-sm">
            Page {currentPage()} of {totalPages()}
          </div>

          <button
            class="px-3 py-1 bg-gray-200 rounded min-w-[80px]"
            onClick={goNext}
            disabled={currentPage() === totalPages()}
          >
            Next
          </button>
        </div>
      </div>
    </FinanceMainLayout>
  );
}

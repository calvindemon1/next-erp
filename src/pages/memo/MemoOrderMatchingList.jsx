import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllOrderMatching,
  softDeleteOrderMatching,
  hasPermission,
  getUser,
} from "../../utils/auth";
import Swal from "sweetalert2";

import { Edit, Eye, Trash } from "lucide-solid";
import SearchSortFilter from "../../components/SearchSortFilter";
import useSimpleFilter from "../../utils/useSimpleFilter";

export default function MemoOrderMatchingList() {
  const [orders, setOrders] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = getUser();

  // Filter
  const { filteredData, applyFilter } = useSimpleFilter(orders, [
    "no_om",
    "supplier_name",
    "kain_name",
    "warna_name",
    "marketing_name",
    "created_at",
  ]);

  // Pagination
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(filteredData().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return filteredData().slice(startIndex, startIndex + pageSize);
  };

  // Fetch MOM
  const handleGetAllOrders = async (tok) => {
    const res = await getAllOrderMatching(tok);

    console.log(res);

    if (res.status === 200) {
      const sorted = res.data.sort((a, b) => b.id - a.id);
      setOrders(sorted);
      applyFilter({});
    } else {
      Swal.fire({
        title: "Gagal",
        text: res.message || "Gagal mengambil data Memo Order Matching",
        icon: "error",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  // Delete
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus Memo Order Matching?",
      text: `Anda yakin ingin menghapus MOM dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await softDeleteOrderMatching({ id }, tokUser?.token);

        Swal.fire({
          title: "Terhapus!",
          text: `MOM dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        setOrders(orders().filter((o) => o.id !== id));
      } catch (error) {
        Swal.fire({
          title: "Gagal",
          text: "Gagal menghapus Memo Order Matching",
          icon: "error",
        });
      }
    }
  };

  // Format date
  function formatTanggalIndo(tanggalString) {
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

    return `${tanggal.getDate()} ${
      bulanIndo[tanggal.getMonth()]
    } ${tanggal.getFullYear()}`;
  }

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllOrders(tokUser.token);
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Memo Order Matching</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/memo-order-matching/form")}
        >
          + Tambah MOM
        </button>
      </div>

      <SearchSortFilter
        sortOptions={[
          { label: "No MOM", value: "no_om" },
          { label: "Tanggal", value: "created_at" },
          { label: "Supplier", value: "supplier_name" },
          { label: "Marketing", value: "marketing_name" },
        ]}
        filterOptions={[
          { label: "Warna Putih", value: "Putih" },
          { label: "Warna Hitam", value: "Hitam" },
          { label: "Supplier PT", value: "PT" },
        ]}
        onChange={applyFilter}
      />

      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-4">No MOM</th>
              <th class="py-2 px-4">Tanggal</th>
              <th class="py-2 px-4">Supplier</th>
              <th class="py-2 px-4">Kain</th>
              <th class="py-2 px-4">Warna</th>
              <th class="py-2 px-4">Marketing</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData().map((mom, index) => (
              <tr class="border-b" key={mom.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>

                <td class="py-2 px-4">{mom.no_om}</td>

                <td class="py-2 px-4">
                  {mom.created_at ? formatTanggalIndo(mom.created_at) : "-"}
                </td>

                <td class="py-2 px-4">{mom.nama_supplier}</td>

                <td class="py-2 px-4">
                  {mom.corak_kain} / {mom.konstruksi_kain}
                </td>

                <td class="py-2 px-4">
                  {mom.kode_warna_ex} - {mom.deskripsi_warna_ex}
                </td>

                <td class="py-2 px-4">{mom.name}</td>

                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-yellow-600 hover:underline"
                    onClick={() => navigate(`/mom/form?id=${mom.id}&view=true`)}
                  >
                    <Eye size={25} />
                  </button>

                  {hasPermission("edit_order_matching") && (
                    <button
                      class="text-blue-600 hover:underline"
                      onClick={() => navigate(`/mom/form?id=${mom.id}`)}
                    >
                      <Edit size={25} />
                    </button>
                  )}

                  {hasPermission("delete_order_matching") && (
                    <button
                      class="text-red-600 hover:underline"
                      onClick={() => handleDelete(mom.id)}
                    >
                      <Trash size={25} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div class="w-full mt-8 flex justify-between">
          <button
            class="px-3 py-1 bg-gray-200 rounded"
            onClick={() => setCurrentPage(currentPage() - 1)}
            disabled={currentPage() === 1}
          >
            Prev
          </button>

          <span>
            Page {currentPage()} of {totalPages()}
          </span>

          <button
            class="px-3 py-1 bg-gray-200 rounded"
            onClick={() => setCurrentPage(currentPage() + 1)}
            disabled={currentPage() === totalPages()}
          >
            Next
          </button>
        </div>
      </div>
    </MainLayout>
  );
}

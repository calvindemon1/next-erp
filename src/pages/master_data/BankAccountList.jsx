import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllBankAccounts,
  softDeleteBankAccounts,
  hasAllPermission,
  getUser,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash } from "lucide-solid";

export default function BankAccountList() {
  const [bankAccount, setBankAccount] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(bankAccount().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return bankAccount().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus Bank Account?",
      text: `Apakah kamu yakin ingin menghapus Bank Account dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteBankAccount = await softDeleteBankAccounts(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data Bank Account dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setBankAccount(bankAccount().filter((s) => s.id !== id));
      } catch (error) {
        Swal.fire({
          title: "Gagal",
          text:
            error.message ||
            `Gagal menghapus data Bank Account dengan ID ${id}`,
          icon: "error",
          
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
        });
      }
    }
  };

  const handleGetAllBankAccount = async () => {
    const result = await getAllBankAccounts(tokUser?.token);

    if (result.status === 200) {
      const sortedData = result.data.sort((a, b) => a.id - b.id);
      setBankAccount(sortedData);
    } else if (result.status === 403) {
      await Swal.fire({
        title: "Tidak Ada Akses",
        text: "Anda tidak memiliki izin untuk melihat Bank Account",
        icon: "warning",
        confirmButtonColor: "#6496df",
      });
      navigate("/dashboard");
    } else {
      Swal.fire({
        title: "Gagal",
        text: result.message || "Gagal mengambil seluruh data Bank Account",
        icon: "error",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllBankAccount(tokUser?.token);
    }
  });
  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Bank Accounts</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/bank-account/form")}
        >
          + Tambah Bank Account
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">Nama Bank Account</th>
              <th class="py-2 px-2">Nomor Bank Account</th>
              {hasAllPermission(["edit_bank_account", "delete_bank_account"]) && (
                <th class="py-2 px-2">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((bankAccount, index) => (
              <tr class="border-b" key={bankAccount.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{bankAccount.bank_account_name}</td>
                <td class="py-2 px-4">{bankAccount.bank_account_number}</td>
                {hasAllPermission(["edit_bank_account", "delete_bank_account"]) && (
                  <td class="py-2 px-4 space-x-2">
                    <button
                      class="text-blue-600 hover:underline"
                      onClick={() =>
                        navigate(`/bank-account/form?id=${bankAccount.id}`)
                      }
                    >
                      <Edit size={25} />
                    </button>
                    <button
                      class="text-red-600 hover:underline"
                      onClick={() => handleDelete(bankAccount.id)}
                    >
                    <Trash size={25} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <div class="w-full mt-8 flex justify-between space-x-2">
          <button
            class="px-3 py-1 bg-gray-200 rounded min-w-[80px]"
            onClick={() => setCurrentPage(currentPage() - 1)}
            disabled={currentPage() === 1}
          >
            Prev
          </button>
          <span>
            Page {currentPage()} of {totalPages()}
          </span>
          <button
            class="px-3 py-1 bg-gray-200 rounded min-w-[80px]"
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

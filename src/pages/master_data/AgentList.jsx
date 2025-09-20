import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllAgents,
  softDeleteAgents,
  hasAllPermission,
  getUser,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash } from "lucide-solid";

export default function AgentList() {
  const [agent, setAgent] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(agent().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return agent().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus Agent?",
      text: `Apakah kamu yakin ingin menghapus Agent dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteAgent = await softDeleteAgents(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data Agent dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setAgent(agent().filter((s) => s.id !== id));
      } catch (error) {
        Swal.fire({
          title: "Gagal",
          text:
            error.message ||
            `Gagal menghapus data Agent dengan ID ${id}`,
          icon: "error",
          
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
        });
      }
    }
  };

  const handleGetAllAgent = async () => {
    const result = await getAllAgents(tokUser?.token);

    if (result.status === 200) {
      const sortedData = result.data.sort((a, b) => a.id - b.id);
      setAgent(sortedData);
    } else if (result.status === 403) {
      await Swal.fire({
        title: "Tidak Ada Akses",
        text: "Anda tidak memiliki izin untuk melihat Agent",
        icon: "warning",
        confirmButtonColor: "#6496df",
      });
      navigate("/dashboard");
    } else {
      Swal.fire({
        title: "Gagal",
        text: result.message || "Gagal mengambil seluruh data Agent",
        icon: "error",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllAgent(tokUser?.token);
    }
  });
  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Agent</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/agent/form")}
        >
          + Tambah Agent
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">Nama Agent</th>
              {hasAllPermission(["edit_agent", "delete_agent"]) && (
                <th class="py-2 px-2">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((agent, index) => (
              <tr class="border-b" key={agent.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{agent.agent_name}</td>
                {hasAllPermission(["edit_agent", "delete_agent"]) && (
                  <td class="py-2 px-4 space-x-2">
                    <button
                      class="text-blue-600 hover:underline"
                      onClick={() =>
                        navigate(`/agent/form?id=${agent.id}`)
                      }
                    >
                      <Edit size={25} />
                    </button>
                    <button
                      class="text-red-600 hover:underline"
                      onClick={() => handleDelete(agent.id)}
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

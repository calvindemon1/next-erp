import { createEffect, createMemo, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../layouts/MainLayout";
import { getAllUsers, getUser, softDeleteUser } from "../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash } from "lucide-solid";
import SearchSortFilter from "../components/SearchSortFilter";

export default function UsersList() {
  const [users, setUsers] = createSignal([]);
  const [filteredUsers, setFilteredUsers] = createSignal([]);

  const navigate = useNavigate();
  const user = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(users().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return users().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus Pengguna?",
      text: `Apakah kamu yakin ingin menghapus pengguna dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteUser = await softDeleteUser(id, user?.token);

        // Optional: tampilkan alert sukses
        await Swal.fire({
          title: "Terhapus!",
          text: `Data pengguna dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setUsers(users().filter((u) => u.id !== id));
      } catch (error) {
        Swal.fire({
          title: "Gagal",
          text: `Gagal menghapus data pengguna dengan ID ${id}`,
          icon: "error",

          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    }
  };

  // const handleGetAllUsers = async () => {
  //   try {
  //     const users = await getAllUsers(user?.token);

  //     if (users.status === 200) {
  //       const sortedData = users.users.sort((a, b) => a.id - b.id);

  //       setUsers(sortedData);
  //     }
  //   } catch (error) {
  //     Swal.fire({
  //       title: "Gagal",
  //       text: "Gagal mengambil seluruh data pengguna",
  //       showConfirmButton: false,
  //       timer: 1000,
  //       timerProgressBar: true,
  //     });
  //   }
  // };

  const handleGetAllUsers = async () => {
    const result = await getAllUsers(user?.token);

    if (result.status === 200) {
      const sortedData = result.users.sort((a, b) => a.id - b.id);
      setUsers(sortedData);
      setFilteredUsers(sortedData);
    } else if (result.status === 403) {
      await Swal.fire({
        title: "Tidak Ada Akses",
        text: "Anda tidak memiliki izin untuk melihat data pengguna",
        icon: "warning",
        confirmButtonColor: "#6496df",
      });
      navigate("/dashboard");
    } else {
      Swal.fire({
        title: "Gagal",
        text: result.message || "Gagal mengambil seluruh data pengguna",
        icon: "error",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  const handleFilterChange = ({ search, sortField, sortOrder, filter }) => {
    let data = [...users()];

    // Search
    if (search) {
      data = data.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter role
    if (filter) {
      if (filter === "Super Admin") {
        data = data.filter((u) => u.role_name.toLowerCase().includes("admin"));
      } else if (filter === "Staff") {
        data = data.filter((u) =>
          u.role_name.toLowerCase().startsWith("staff")
        );
      }
    }

    // Sorting
    if (sortField) {
      data.sort((a, b) => {
        const valA = a[sortField].toString().toLowerCase();
        const valB = b[sortField].toString().toLowerCase();
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      });
    }

    setFilteredUsers(data);
    setCurrentPage(1);
  };

  createEffect(() => {
    if (user?.token) {
      handleGetAllUsers();
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Pengguna</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/users/form")}
        >
          + Tambah User
        </button>
      </div>
      <SearchSortFilter
        sortOptions={[
          { label: "Nama", value: "name" },
          { label: "Username", value: "username" },
          { label: "Role", value: "role" },
        ]}
        filterOptions={[
          { label: "Super Admin", value: "Super Admin" },
          { label: "Staff", value: "Staff" },
        ]}
        onChange={handleFilterChange}
      />
      <table class="w-full bg-white shadow rounded">
        <thead class="bg-gray-200 text-left text-sm uppercase text-gray-700">
          <tr>
            <th class="py-2 px-4">ID</th>
            <th class="py-2 px-4">Name</th>
            <th class="py-2 px-4">Username</th>
            <th class="py-2 px-4">Role</th>
            <th class="py-2 px-4">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers()
            .slice((currentPage() - 1) * pageSize, currentPage() * pageSize)
            .map((user, index) => (
              <tr class="border-b" key={user.id}>
                <td class="py-2 px-4">{index + 1}</td>
                <td class="py-2 px-4 capitalize">{user.name}</td>
                <td class="py-2 px-4 capitalize">{user.username}</td>
                <td class="py-2 px-4 capitalize">{user.role_name}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/users/form?id=${user.id}`)}
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(user.id)}
                  >
                    <Trash size={25} />
                  </button>
                </td>
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
    </MainLayout>
  );
}

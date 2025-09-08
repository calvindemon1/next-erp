import { createSignal, onMount, For } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../layouts/MainLayout";
import { 
  getDataUser, 
  getUser, 
  register, 
  updateUser,
  getAllRoles
} from "../utils/auth";
import Swal from "sweetalert2";

export default function UserForm() {
  const [form, setForm] = createSignal({
    id: "",
    name: "",
    username: "",
    password: "",
    role_id: "",
    account_type_id: "1",
  });
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();
  const [roles, setRoles] = createSignal([]);

  onMount(async () => {
    try {
      // GET All Data Roles
      const rolesData = await getAllRoles(user?.token);
      if (rolesData.status === 200 && rolesData.result) {
        setRoles(rolesData.result);
        // Set role_id default ke role pertama jika membuat user baru
        if (!isEdit && rolesData.result.length > 0) {
          setForm(prev => ({ ...prev, role_id: rolesData.result[0].id }));
        }
      }

      // GET Data user ketika edit
      if (isEdit) {
        const userDataResponse = await getDataUser(params.id, user?.token);
        const userData = userDataResponse.user;
        
        // Konversi tipe akun dari nama ke angka
        let accountType = 1;
        if (userData.account_type_name === "ppn") {
          accountType = 2;
        }

        setForm({
          id: params.id,
          name: userData.name,
          username: userData.username,
          password: "",
          role_id: userData.role_id,
          account_type_id: accountType,
        });
      }
    } catch (error) {
      console.error("Gagal memuat data:", error);
      Swal.fire("Error", "Gagal memuat data roles atau user.", "error");
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateUser(
          form().id,
          form().name,
          form().username,
          form().password,
          form().role_id,
          form().account_type_id,
          user?.token
        );
      } else {
        await register(
          form().name,
          form().username,
          form().password,
          form().role_id,
          form().account_type_id,
          user?.token
        );
      }
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit ? "Berhasil mengubah user" : "Berhasil membuat user baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/users"));
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message || (isEdit ? "Gagal mengubah user" : "Gagal membuat user baru"),
      });
    }
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">{isEdit ? "Edit" : "Tambah"} User</h1>
      <form class="space-y-4" onSubmit={handleSubmit}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label class="block mb-1 font-medium">Name</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().name}
              onInput={(e) => setForm({ ...form(), name: e.target.value })}
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Username</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().username}
              onInput={(e) => setForm({ ...form(), username: e.target.value })}
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">
              Password 
              {isEdit && <span class="text-sm text-gray-500"></span>}
            </label>
            <input
              type="password"
              class="w-full border p-2 rounded"
              value={form().password}
              onInput={(e) => setForm({ ...form(), password: e.target.value })}
              required={!isEdit}
            />
          </div>
          
          <div>
            <label class="block mb-1 font-medium">Tipe Akses</label>
            <select
              class="w-full border p-2 rounded capitalize"
              value={form().role_id}
              onChange={(e) => setForm({ ...form(), role_id: e.target.value })}
              required
            >
              <option value="" disabled>Pilih Tipe Akses</option>
              <For each={roles()}>
                {(role) => (
                  <option value={role.id} class="capitalize">
                    {role.name}
                  </option>
                )}
              </For>
            </select>
          </div>

          <div>
            <label class="block mb-1 font-medium">
              Tipe Akun (PPN/Non-PPN)
            </label>
            <select
              class="w-full border p-2 rounded"
              value={form().account_type_id}
              onChange={(e) => setForm({ ...form(), account_type_id: e.target.value })}
            >
              <option value="1">User (Non-PPN)</option>
              <option value="2">User (PPN)</option>
            </select>
          </div>
        </div>
        <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Simpan
        </button>
      </form>
    </MainLayout>
  );
}
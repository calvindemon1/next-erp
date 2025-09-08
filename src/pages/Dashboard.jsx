import MainLayout from "../layouts/MainLayout";
import { getUser, hasPermission, hasRole } from "../utils/auth";
import { onMount, createSignal } from "solid-js";

export default function Dashboard() {
  const user = getUser();
  const [permissions, setPermissions] = createSignal([]);

  onMount(() => {
    const perms = JSON.parse(localStorage.getItem("permissions") || "[]");
    setPermissions(perms);
  });


  const stats = [
    { title: "Pesanan", value: 128 },
    { title: "Customer", value: 56 },
    { title: "Transaksi", value: 4 },
    { title: "User", value: 3 },
  ];

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">Dashboard</h1>

      {/* <p class="mb-2">
        Anda login sebagai <strong>{user.role.toUpperCase()}</strong>.
      </p> */}

      {/* {user.role === "ppn" ? (
        <div class="mb-6 p-4 bg-green-100 border border-green-300 rounded">
          <p>
            Ini konten khusus untuk pengguna <strong>PPN</strong>
          </p>
        </div>
      ) : (
        <div class="mb-6 p-4 bg-blue-100 border border-blue-300 rounded">
          <p>
            Ini konten khusus untuk pengguna <strong>Non-PPN</strong>
          </p>
        </div>
      )} */}

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div class="bg-white p-6 rounded shadow hover:shadow-md transition-all">
            <p class="text-sm text-gray-500">{stat.title}</p>
            <p class="text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
    </MainLayout>
  );
}

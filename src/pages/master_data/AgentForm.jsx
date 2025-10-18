import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  createAgent,
  getAgents,
  getUser,
  updateAgents,
} from "../../utils/auth";
import Swal from "sweetalert2";

export default function AgentForm() {
  const [form, setForm] = createSignal({
    id: "",
    agent_name: "",
  });
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  onMount(async () => {
    if (isEdit) {
      const agent = await getAgents(params.id, user?.token);
      //console.log(customerType)
      setForm({
        id: params.id,
        agent_name: agent.data.agent_name,
      });
    }
  });

  const handleKeyDown = (e) => {
    const tag = e.target.tagName;
    const type = e.target.type;

    if (
      e.key === "Enter" &&
      tag !== "TEXTAREA" &&
      type !== "submit" &&
      type !== "button"
    ) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await updateAgents(user?.token, params.id, form().agent_name);
      } else {
        await createAgent(user?.token, form().agent_name);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengubah data Agent"
          : "Berhasil membuat Agent baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/agent"));
    } catch (error) {
      //console.log(error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: isEdit
          ? "Gagal mengubah data Agent"
          : "Gagal membuat data Agent baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Agent
      </h1>
      <form class="space-y-4 max-w-lg" onSubmit={handleSubmit} onkeydown={handleKeyDown}>
        <div>
          <label class="block mb-1 font-medium">Nama Agent</label>
          <input
            type="text"
            class="w-full border p-2 rounded"
            value={form().agent_name}
            onInput={(e) => setForm({ ...form(), agent_name: e.target.value })}
            required
          />
        </div>
        <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Simpan
        </button>
      </form>
    </MainLayout>
  );
}

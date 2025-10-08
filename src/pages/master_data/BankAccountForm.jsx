import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  createBankAccount,
  getBankAccounts,
  updateBankAccounts,
  getUser,
} from "../../utils/auth";
import Swal from "sweetalert2";

export default function BankAccountForm() {
  const [form, setForm] = createSignal({
    id: "",
    bank_account_name: "",
    bank_account_number: "",
    beneficiary_name: "",
    bank_account_address: "",
    swift_code: "",
  });
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  // Helpers untuk SWIFT CODE - UNUSED FOR NOW
  const normalizeSwift = (v) => (v || "").replace(/\s+/g, "").toUpperCase();
  const isValidSwift = (v) =>
    /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v) &&
    v.length >= 8 &&
    v.length <= 11;

  onMount(async () => {
    if (isEdit) {
      const bankAccount = await getBankAccounts(params.id, user?.token);
      //console.log(customerType)
      setForm({
        id: params.id,
        bank_account_name: bankAccount.data.bank_account_name,
        bank_account_number: bankAccount.data.bank_account_number,
        beneficiary_name: bankAccount.data.beneficiary_name,
        bank_account_address: bankAccount.data.bank_account_address,
        swift_code: bankAccount.data.swift_code,
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // validasi & normalisasi SWIFT sebelum submit
    const swift = form().swift_code;

    try {
      if (isEdit) {
        await updateBankAccounts(
          user?.token,
          params.id,
          form().bank_account_name,
          form().bank_account_number,
          form().beneficiary_name,
          form().bank_account_address,
          swift
        );
      } else {
        await createBankAccount(
          user?.token,
          form().bank_account_name,
          form().bank_account_number,
          form().beneficiary_name,
          form().bank_account_address,
          swift
        );
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengubah data Bank Account"
          : "Berhasil membuat Bank Account baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/bank-account"));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: isEdit
          ? "Gagal mengubah data Bank Account"
          : "Gagal membuat data Bank Account baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Bank Account
      </h1>
      <form class="w-full space-y-6" onSubmit={handleSubmit}>
        <div class="grid grid-cols-3 gap-6">
          <div class="col-span-1">
            <label class="block mb-1 font-medium">Nama Bank Account</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().bank_account_name}
              onInput={(e) =>
                setForm({ ...form(), bank_account_name: e.currentTarget.value })
              }
              required
            />
          </div>

          <div class="col-span-1">
            <label class="block mb-1 font-medium">Nomor Bank Account</label>
            <input
              type="text" 
              inputmode="numeric"        
              pattern="[0-9]*"           
              class="w-full border p-2 rounded"
              value={form().bank_account_number}
              onInput={(e) => {
                const onlyDigits = e.currentTarget.value.replace(/\D/g, "");
                setForm({ ...form(), bank_account_number: onlyDigits });
              }}
              required
            />
          </div>

          <div class="col-span-1">
            <label class="block mb-1 font-medium">Beneficiary Name</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().beneficiary_name}
              onInput={(e) =>
                setForm({ ...form(), beneficiary_name: e.currentTarget.value })
              }
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-6">
          <div class="col-span-1">
            <label class="block mb-1 font-medium">Alamat</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().bank_account_address}
              onInput={(e) =>
                setForm({ ...form(), bank_account_address: e.currentTarget.value })
              }
              required
            />
          </div>

          <div class="col-span-1">
            <label class="block mb-1 font-medium">
              Swift Code
            </label>
            <input
              type="text"
              inputmode="text"
              autocomplete="off"
              class="w-full border p-2 rounded tracking-widest"
              value={form().swift_code}
              onInput={(e) => {
                setForm({ ...form(), swift_code: e.currentTarget.value });
              }}
              required
            />
          </div>
        </div>

        <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Simpan
        </button>
      </form>
    </MainLayout>
  );
}

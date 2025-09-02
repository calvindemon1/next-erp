// api.js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL; // {{cloudflared}}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============ Interceptors ============
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("API Error:", err.response?.data || err.message);
    return Promise.reject(err);
  }
);

// ============ BANKS ============
const Banks = {
  create: async (payload) => (await api.post("/create-bank", payload)).data,
  getAll: async () => (await api.get("/banks")).data,
  getById: async (id) => (await api.get(`/banks/${id}`)).data,
  update: async (id, payload) =>
    (await api.put(`/update-bank/${id}`, payload)).data,
  delete: async (id) => (await api.delete(`/delete-bank/${id}`)).data,
};

// ============ JENIS POTONGAN ============
const JenisPotongan = {
  create: async (payload) =>
    (await api.post("/create-jenis-potongan", payload)).data,
  getAll: async () => (await api.get("/jenis-potongan")).data,
  getById: async (id) => (await api.get(`/jenis-potongan/${id}`)).data,
  update: async (id, payload) =>
    (await api.put(`/update-jenis-potongan/${id}`, payload)).data,
  delete: async (id) => (await api.delete(`/delete-jenis-potongan/${id}`)).data,
};

// ============ JENIS HUTANG ============
const JenisHutang = {
  create: async (payload) =>
    (await api.post("/create-jenis-hutang", payload)).data,
  getAll: async () => (await api.get("/jenis-hutang")).data,
  getById: async (id) => (await api.get(`/jenis-hutang/${id}`)).data,
  update: async (id, payload) =>
    (await api.put(`/update-jenis-hutang/${id}`, payload)).data,
  delete: async (id) => (await api.delete(`/delete-jenis-hutang/${id}`)).data,
};

// ============ PURCHASE AKSESORIS EKSPEDISI ============
const PurchaseAksesorisEkspedisi = {
  create: async (payload) =>
    (await api.post("/create-purchase-aksesoris-ekspedisi", payload)).data,

  getAll: async () => (await api.get("/purchase-aksesoris-ekspedisi")).data,

  getById: async (id) =>
    (await api.get(`/purchase-aksesoris-ekspedisi/${id}`)).data,

  update: async (id, payload) =>
    (await api.put(`/update-purchase-aksesoris-ekspedisi/${id}`, payload)).data,

  delete: async (id) =>
    (await api.delete(`/delete-purchase-aksesoris-ekspedisi/${id}`)).data,
};

// Export bareng
export { Banks, JenisPotongan, JenisHutang, PurchaseAksesorisEkspedisi };

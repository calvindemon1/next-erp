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
  create: async (payload) => {
    const res = await api.post("/create-bank", payload);
    // console.log("Banks.create response:", res);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/banks");
    // console.log("Banks.getAll response:", res);
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/banks/${id}`);
    // console.log("Banks.getById response:", res);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/update-bank/${id}`, payload);
    // console.log("Banks.update response:", res);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/delete-bank/${id}`);
    // console.log("Banks.delete response:", res);
    return res.data;
  },
};

// ============ JENIS POTONGAN ============
const JenisPotongan = {
  create: async (payload) => {
    const res = await api.post("/create-jenis-potongan", payload);
    // console.log("JenisPotongan.create response:", res);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/jenis-potongan");
    // console.log("JenisPotongan.getAll response:", res);
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/jenis-potongan/${id}`);
    // console.log("JenisPotongan.getById response:", res);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/update-jenis-potongan/${id}`, payload);
    // console.log("JenisPotongan.update response:", res);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/delete-jenis-potongan/${id}`);
    // console.log("JenisPotongan.delete response:", res);
    return res.data;
  },
};

// ============ JENIS HUTANG ============
const JenisHutang = {
  create: async (payload) => {
    const res = await api.post("/create-jenis-hutang", payload);
    // console.log("JenisHutang.create response:", res);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/jenis-hutang");
    // console.log("JenisHutang.getAll response:", res);
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/jenis-hutang/${id}`);
    // console.log("JenisHutang.getById response:", res);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/update-jenis-hutang/${id}`, payload);
    // console.log("JenisHutang.update response:", res);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/delete-jenis-hutang/${id}`);
    // console.log("JenisHutang.delete response:", res);
    return res.data;
  },
};

// ============ PURCHASE AKSESORIS EKSPEDISI ============
const PurchaseAksesorisEkspedisi = {
  create: async (payload) => {
    const res = await api.post("/create-purchase-aksesoris-ekspedisi", payload);
    // console.log("PurchaseAksesorisEkspedisi.create response:", res);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/purchase-aksesoris-ekspedisi");
    // console.log("PurchaseAksesorisEkspedisi.getAll response:", res);
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/purchase-aksesoris-ekspedisi/${id}`);
    // console.log("PurchaseAksesorisEkspedisi.getById response:", res);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(
      `/update-purchase-aksesoris-ekspedisi/${id}`,
      payload
    );
    // console.log("PurchaseAksesorisEkspedisi.update response:", res);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/delete-purchase-aksesoris-ekspedisi/${id}`);
    // console.log("PurchaseAksesorisEkspedisi.delete response:", res);
    return res.data;
  },
};

const User = {
  getUser: () => JSON.parse(localStorage.getItem("user")),
};

// Export bareng
export { Banks, JenisPotongan, JenisHutang, PurchaseAksesorisEkspedisi, User };

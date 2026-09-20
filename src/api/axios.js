import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Logos backend se aate hain: http://localhost:5000/logos/cafe.png
export const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, "");

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("shopUser"));
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("shopUser");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

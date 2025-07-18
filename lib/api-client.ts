import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL_BACKEND;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: true, // Para cookies de autenticação se necessário
});

// Interceptor para logs de requisição
apiClient.interceptors.request.use(
  (config) => {
    // Garantir que DELETE requests tenham headers corretos
    if (config.method?.toLowerCase() === "delete") {
      config.headers.set("Content-Type", "application/json");
    }

    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    console.log("📤 Headers:", config.headers);
    if (config.data) {
      console.log("📤 Data:", config.data);
    }
    return config;
  },
  (error) => {
    console.error("❌ Erro na requisição:", error);
    return Promise.reject(error);
  }
);

// Interceptor para logs de resposta
apiClient.interceptors.response.use(
  (response) => {
    console.log(
      `✅ ${response.status} ${response.config.method?.toUpperCase()} ${
        response.config.url
      }`
    );
    console.log("📦 Resposta da API:", response.data);
    return response;
  },
  (error) => {
    console.error(
      "❌ Erro na resposta:",
      error.response?.data || error.message
    );
    console.error("❌ Status:", error.response?.status);
    console.error("❌ Headers:", error.response?.headers);
    return Promise.reject(error);
  }
);

export default apiClient;

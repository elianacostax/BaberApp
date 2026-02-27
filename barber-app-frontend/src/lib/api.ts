import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (!API_BASE_URL) {
  // No lanzamos error duro para permitir desarrollo del resto de la app
  // pero es recomendable definir VITE_API_BASE_URL en .env
  console.warn('VITE_API_BASE_URL no está definido. Configura tu .env');
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de respuesta para manejar errores y timeouts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.error('Timeout de la solicitud:', error.config?.url);
      return Promise.reject({
        ...error,
        message: 'La solicitud tardó demasiado tiempo. Verifica tu conexión.',
        isTimeout: true,
      });
    }
    
    if (error.response?.status === 429) {
      console.warn('Rate limit alcanzado:', error.config?.url);
      return Promise.reject({
        ...error,
        message: 'Demasiadas solicitudes. Espera un momento antes de intentar nuevamente.',
        isRateLimit: true,
      });
    }
    
    return Promise.reject(error);
  }
);

export type ApiError = {
  message?: string;
};


import axios from 'axios';

const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
const API_BASE_URL = ENV_API_BASE_URL?.trim() || 'http://localhost:5000';

if (!ENV_API_BASE_URL) {
  // Fallback para desarrollo local cuando no existe .env en frontend.
  console.warn('VITE_API_BASE_URL no está definido. Usando http://localhost:5000');
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

    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const token = localStorage.getItem('jwt');
      if (token) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { reason: 'unauthorized' } }));
      }
    }
    
    return Promise.reject(error);
  }
);

export type ApiError = {
  message?: string;
};

import axios from 'axios';

const compassApi = axios.create({
  baseURL: '/api/v2/compass',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 401 interceptor: auto-refresh access token on expiry
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
};

compassApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only intercept 401s, skip if already retried or if it's a refresh/auth request
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => compassApi(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Dynamic import to avoid circular dependency
      const { useCompassAuthStore } = await import(
        '../../features/auth/application/useCompassAuthStore'
      );
      await useCompassAuthStore.getState().refresh();
      processQueue(null);
      return compassApi(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default compassApi;

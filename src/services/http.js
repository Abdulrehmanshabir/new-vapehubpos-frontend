import axios from 'axios';

// Resolve API base URL strictly from env (no hardcoded fallback)
function resolveBaseURL() {
  const raw = import.meta?.env?.VITE_API_URL;
  const val = typeof raw === 'string' ? raw.trim() : '';
  const invalid = !val || val === 'undefined' || val === 'null' || val === '/';
  return invalid ? undefined : val.replace(/\/+$/, '');
}

const http = axios.create({
  baseURL:resolveBaseURL(),
});
http.interceptors.request.use((config) => {
  const tk = localStorage.getItem('accessToken');
  if (tk) config.headers.Authorization = `Bearer ${tk}`;
  // Attach branchId for branch-scoped endpoints if missing
  try {
    const branchId = localStorage.getItem('activeBranchId');
    const url = config.url || '';
    const isScoped = url.startsWith('/api/stock') || url.startsWith('/api/sales') || url.startsWith('/api/reports');
    if (branchId && isScoped) {
      if ((config.method || 'get').toLowerCase() === 'get') {
        const usp = new URLSearchParams(config.params || {});
        if (!usp.has('branchId')) usp.set('branchId', branchId);
        config.params = Object.fromEntries(usp.entries());
      } else if (config.data && typeof config.data === 'object' && !('branchId' in config.data)) {
        config.data = { ...config.data, branchId };
      }
    }
  } catch {}
  return config;
});

// Centralized response error handling
http.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Token invalid/expired: sign out and redirect to login
      localStorage.removeItem('accessToken');
      try { window?.location?.assign?.('/login'); } catch {}
    }
    return Promise.reject(error);
  }
);
export default http;

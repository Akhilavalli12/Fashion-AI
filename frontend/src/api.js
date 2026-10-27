import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const tokenStore = {
  get() {
    return localStorage.getItem('token');
  },

  set(token) {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },

  clear() {
    localStorage.removeItem('token');
  },
};

// Attach the login token to authenticated requests.
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStore.get();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Supports api('/auth/login', { method: 'POST', body: {...} })
const api = (url, options = {}) => {
  const { body, ...config } = options;

  return apiClient
    .request({
      url,
      ...config,
      ...(body !== undefined ? { data: body } : {}),
    })
    .then((response) => response.data);
};

// Supports api.get(), api.post(), api.put(), and api.delete().
api.get = (url, config) =>
  apiClient.get(url, config).then((response) => response.data);

api.post = (url, data, config) =>
  apiClient.post(url, data, config).then((response) => response.data);

api.put = (url, data, config) =>
  apiClient.put(url, data, config).then((response) => response.data);

api.delete = (url, config) =>
  apiClient.delete(url, config).then((response) => response.data);

// Step 1: upload an image for analysis.
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await apiClient.post(
    '/items/analyze',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

export { api };
export default api;
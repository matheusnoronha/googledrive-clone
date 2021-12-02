import Axios from 'axios';

const api = Axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 9999,
  maxContentLength: Infinity,
  maxContentLength: Infinity,
  headers: {
    "Content-Type": "multipart/form-data"
  }
});

export default api;
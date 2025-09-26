// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (window.location.origin.includes('localhost') 
    ? 'http://localhost:5000' 
    : window.location.origin.replace(/:\d+$/, ':5000'));

export const API_ENDPOINTS = {
  UPLOAD: `${API_BASE_URL}/upload`,
  TEST_GENERATION: `${API_BASE_URL}/api/test-generation/generate-streaming`,
  HEALTH: `${API_BASE_URL}/health`,
  FILES: `${API_BASE_URL}/files`,
  DELETE_FILE: (filename: string) => `${API_BASE_URL}/delete/${filename}`,
  FILE_URL: (url: string) => `${API_BASE_URL}${url}`,
};

export default API_BASE_URL;

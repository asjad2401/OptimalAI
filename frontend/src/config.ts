export const API_BASE_URL = 'http://47.131.167.116:8000/api/v1';

export const AUTH_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
};

export const SCRAPER_ENDPOINTS = {
  ANALYZE: `${API_BASE_URL}/scraper/analyze`,
  HISTORY: `${API_BASE_URL}/scraper/history`,
  REPORT: (id: string) => `${API_BASE_URL}/scraper/report/${id}`,
};

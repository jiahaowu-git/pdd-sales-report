import http from '@/lib/request';

export function fetchDashboard({ shopName, startDate, endDate }) {
  return http.get('/api/dashboard', {
    params: { shopName, startDate, endDate },
  });
}

export function fetchDetail({ shopName, startDate, endDate, fileName }) {
  return http.get('/api/detail', {
    params: { shopName, startDate, endDate, fileName },
  });
}
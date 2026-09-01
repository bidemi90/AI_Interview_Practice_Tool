import apiClient from './apiClient.js';

export async function registerUser(payload) {
  const response = await apiClient.post('/auth/register', payload);
  return response.data.data;
}

export async function loginUser(payload) {
  const response = await apiClient.post('/auth/login', payload);
  return response.data.data;
}

export async function fetchCurrentUser() {
  const response = await apiClient.get('/users/me');
  return response.data.data.user;
}

export async function updateCurrentUser(payload) {
  const response = await apiClient.patch('/users/me', payload);
  return response.data.data.user;
}

export async function changeCurrentPassword(payload) {
  const response = await apiClient.patch('/users/me/password', payload);
  return response.data.data;
}

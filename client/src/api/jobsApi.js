import apiClient from './apiClient.js';

export async function fetchRoles() {
  const response = await apiClient.get('/roles');
  return response.data.data.roles;
}

export async function analyzeJob(payload) {
  const response = await apiClient.post('/jobs/analyze', payload, { timeout: 300_000 });
  return response.data.data.jobProfile;
}

export async function fetchJobs({ page = 1, limit = 10 } = {}) {
  const response = await apiClient.get('/jobs', { params: { page, limit } });
  return response.data.data;
}

export async function fetchJob(jobProfileId) {
  const response = await apiClient.get(`/jobs/${jobProfileId}`);
  return response.data.data.jobProfile;
}

export async function getAssessmentsForJob(jobProfileId) {
  const response = await apiClient.get(`/jobs/${jobProfileId}/assessments`);
  return response.data.data.assessments;
}

export async function getAssessmentPlan(jobProfileId, mode) {
  const response = await apiClient.get(`/jobs/${jobProfileId}/assessment-plan`, { params: { mode } });
  return response.data.data.plan;
}

export async function deleteJob(jobProfileId) {
  const response = await apiClient.delete(`/jobs/${jobProfileId}`);
  return response.data.data;
}

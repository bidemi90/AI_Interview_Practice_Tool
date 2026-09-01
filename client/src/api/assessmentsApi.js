import apiClient from './apiClient.js';

export async function createAssessment(payload) {
  const response = await apiClient.post('/assessments', payload, { timeout: 600_000 });
  return response.data.data.assessment;
}

export async function fetchAssessment(assessmentId) {
  const response = await apiClient.get(`/assessments/${assessmentId}`);
  return response.data.data.assessment;
}

export async function fetchAssessmentStatus(assessmentId) {
  const response = await apiClient.get(`/assessments/${assessmentId}/status`);
  return response.data.data;
}

export async function fetchAssessmentQuestions(assessmentId) {
  const response = await apiClient.get(`/assessments/${assessmentId}/questions`);
  return response.data.data.questions;
}

export async function startAssessment(assessmentId) {
  const response = await apiClient.post(`/assessments/${assessmentId}/start`);
  return response.data.data.session;
}

export async function getAssessmentSession(assessmentId) {
  const response = await apiClient.get(`/assessments/${assessmentId}`);
  return response.data.data.assessment;
}

export async function getAssessmentQuestion(assessmentId, questionId) {
  const response = await apiClient.get(`/assessments/${assessmentId}/questions/${questionId}`);
  return response.data.data.question;
}

export async function getAssessmentQuestionByIndex(assessmentId, index) {
  const response = await apiClient.get(`/assessments/${assessmentId}/questions/by-index/${index}`);
  return response.data.data;
}

export async function saveAssessmentAnswer(assessmentId, questionId, answer) {
  const response = await apiClient.put(`/assessments/${assessmentId}/answers/${questionId}`, { answer });
  return response.data.data;
}

export async function updateCurrentQuestion(assessmentId, currentQuestionIndex) {
  const response = await apiClient.patch(`/assessments/${assessmentId}/progress`, { currentQuestionIndex });
  return response.data.data;
}

export async function submitAssessment(assessmentId) {
  const response = await apiClient.post(`/assessments/${assessmentId}/submit`);
  return response.data.data;
}

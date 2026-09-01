import apiClient from './apiClient.js';

export async function createAssessment(payload) {
  const response = await apiClient.post('/assessments', payload);
  return response.data.data.assessment;
}

export async function retryAssessmentSection(assessmentId, sectionName) {
  const response = await apiClient.post(`/assessments/${assessmentId}/sections/${encodeURIComponent(sectionName)}/retry`);
  return response.data.data;
}

export async function fetchAssessment(assessmentId) {
  const response = await apiClient.get(`/assessments/${assessmentId}`);
  return response.data.data.assessment;
}

export async function getRecentAssessments(limit = 10) {
  const response = await apiClient.get('/assessments/recent', { params: { limit } });
  return response.data.data.assessments;
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

export async function saveAssessmentAnswer(assessmentId, questionId, answer, answerVersion) {
  const response = await apiClient.put(`/assessments/${assessmentId}/answers/${questionId}`, { answer, answerVersion });
  return response.data.data;
}

export async function updateCurrentQuestion(assessmentId, currentQuestionIndex, navigationVersion) {
  const response = await apiClient.patch(`/assessments/${assessmentId}/progress`, { currentQuestionIndex, navigationVersion });
  return response.data.data;
}

export async function submitAssessment(assessmentId) {
  const response = await apiClient.post(`/assessments/${assessmentId}/submit`);
  return response.data.data;
}

export async function scoreAssessment(assessmentId) {
  const response = await apiClient.post(`/assessments/${assessmentId}/score`, {}, { timeout: 180_000 });
  return response.data.data.result;
}

export async function getAssessmentResults(assessmentId) {
  const response = await apiClient.get(`/assessments/${assessmentId}/results`);
  return response.data.data.result;
}

export async function getAssessmentReviewQuestions(assessmentId) {
  const response = await apiClient.get(`/assessments/${assessmentId}/results/questions`);
  return response.data.data.questions;
}

export async function retryAssessmentFeedback(assessmentId) {
  const response = await apiClient.post(`/assessments/${assessmentId}/results/feedback/retry`, {}, { timeout: 180_000 });
  return response.data.data.result;
}

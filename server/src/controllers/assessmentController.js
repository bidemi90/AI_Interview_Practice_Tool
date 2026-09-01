import { createAssessment, getAssessmentMetadata, getAssessmentStatus, getPublicAssessmentQuestions } from '../services/assessmentService.js';
import { getQuestionById, getQuestionByIndex, saveAnswer, startAssessment, submitAssessment, updateCurrentPosition } from '../services/assessmentSessionService.js';

export async function create(request, response) {
  const assessment = await createAssessment(request.user.id, request.validatedBody);
  response.status(201).json({ success: true, data: { assessment } });
}

export async function status(request, response) {
  const assessmentStatus = await getAssessmentStatus(request.user.id, request.params.id);
  response.status(200).json({ success: true, data: assessmentStatus });
}

export async function getOne(request, response) {
  const assessment = await getAssessmentMetadata(request.user.id, request.params.id);
  response.status(200).json({ success: true, data: { assessment } });
}

export async function getQuestions(request, response) {
  const questions = await getPublicAssessmentQuestions(request.user.id, request.params.id);
  response.status(200).json({ success: true, data: { questions } });
}

export async function start(request, response) {
  const session = await startAssessment(request.user.id, request.params.id);
  response.status(200).json({ success: true, data: { session } });
}

export async function getQuestion(request, response) {
  const question = await getQuestionById(request.user.id, request.params.id, request.params.questionId);
  response.status(200).json({ success: true, data: { question } });
}

export async function getQuestionAtIndex(request, response) {
  const result = await getQuestionByIndex(request.user.id, request.params.id, request.params.index);
  response.status(200).json({ success: true, data: result });
}

export async function putAnswer(request, response) {
  const progress = await saveAnswer(request.user.id, request.params.id, request.params.questionId, request.validatedBody.answer);
  response.status(200).json({ success: true, data: { saved: true, progress } });
}

export async function updatePosition(request, response) {
  const position = await updateCurrentPosition(request.user.id, request.params.id, request.validatedBody.currentQuestionIndex);
  response.status(200).json({ success: true, data: position });
}

export async function submit(request, response) {
  const result = await submitAssessment(request.user.id, request.params.id);
  response.status(200).json({ success: true, data: result });
}

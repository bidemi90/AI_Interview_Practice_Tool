import { createAssessment, getAssessmentMetadata, getAssessmentStatus, getPublicAssessmentQuestions, listRecentAssessments, retryFailedSection } from '../services/assessmentService.js';
import { getQuestionById, getQuestionByIndex, saveAnswer, startAssessment, submitAssessment, updateCurrentPosition } from '../services/assessmentSessionService.js';
import { getScoredAssessment, retryAssessmentFeedback, scoreSubmittedAssessment } from '../services/scoringService.js';
import { serializeAssessmentResults, serializeQuestionReview } from '../serializers/assessmentSerializer.js';

export async function create(request, response) {
  const assessment = await createAssessment(request.user.id, request.validatedBody);
  response.status(201).json({ success: true, data: { assessment } });
}

export async function status(request, response) {
  const assessmentStatus = await getAssessmentStatus(request.user.id, request.params.id);
  response.status(200).json({ success: true, data: assessmentStatus });
}

export async function retrySection(request, response) {
  const progress = await retryFailedSection(request.user.id, request.params.id, request.params.sectionKey);
  response.status(202).json({ success: true, data: progress });
}

export async function recent(request, response) {
  const assessments = await listRecentAssessments(request.user.id, Number(request.query.limit || 10));
  response.status(200).json({ success: true, data: { assessments } });
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
  const progress = await saveAnswer(request.user.id, request.params.id, request.params.questionId, request.validatedBody.answer, request.validatedBody.answerVersion);
  response.status(200).json({ success: true, data: { saved: true, progress } });
}

export async function updatePosition(request, response) {
  const position = await updateCurrentPosition(request.user.id, request.params.id, request.validatedBody.currentQuestionIndex, request.validatedBody.navigationVersion);
  response.status(200).json({ success: true, data: position });
}

export async function submit(request, response) {
  const result = await submitAssessment(request.user.id, request.params.id);
  response.status(200).json({ success: true, data: result });
}

export async function score(request, response) {
  const assessment = await scoreSubmittedAssessment(request.user.id, request.params.id);
  response.status(200).json({ success: true, data: { result: serializeAssessmentResults(assessment) } });
}

export async function results(request, response) {
  const assessment = await getScoredAssessment(request.user.id, request.params.id);
  response.status(200).json({ success: true, data: { result: serializeAssessmentResults(assessment) } });
}

export async function reviewQuestions(request, response) {
  const assessment = await getScoredAssessment(request.user.id, request.params.id);
  response.status(200).json({ success: true, data: { questions: serializeQuestionReview(assessment) } });
}

export async function retryFeedback(request, response) {
  const assessment = await retryAssessmentFeedback(request.user.id, request.params.id);
  response.status(200).json({ success: true, data: { result: serializeAssessmentResults(assessment) } });
}

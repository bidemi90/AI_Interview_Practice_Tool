import { serializeAssessmentSession, serializePublicQuestion } from '../serializers/assessmentSerializer.js';
import { AppError } from '../utils/AppError.js';
import { getOwnedAssessment } from './assessmentService.js';

function ensureInProgress(assessment) {
  if (assessment.status !== 'in_progress') {
    const message = assessment.status === 'submitted' ? 'Submitted assessments are read-only.' : 'Assessment is not in progress.';
    throw new AppError(message, 409, assessment.status === 'submitted' ? 'ASSESSMENT_SUBMITTED' : 'ASSESSMENT_NOT_IN_PROGRESS');
  }
}

function findQuestion(assessment, questionId) {
  const question = assessment.questions.find((item) => item.questionId === questionId);
  if (!question) throw new AppError('Question not found in this assessment.', 404, 'QUESTION_NOT_FOUND');
  return question;
}

export async function startAssessment(userId, assessmentId) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  if (assessment.status === 'ready') {
    assessment.status = 'in_progress';
    assessment.startedAt ||= new Date();
    assessment.currentQuestionIndex = Math.min(assessment.currentQuestionIndex || 0, assessment.questions.length - 1);
    await assessment.save();
  } else if (assessment.status !== 'in_progress') {
    const code = assessment.status === 'submitted' ? 'ASSESSMENT_SUBMITTED' : 'ASSESSMENT_NOT_READY';
    throw new AppError('Assessment cannot be started in its current state.', 409, code);
  }
  return serializeAssessmentSession(assessment);
}

export async function getAssessmentSession(userId, assessmentId) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  return serializeAssessmentSession(assessment);
}

export async function getQuestionById(userId, assessmentId, questionId) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  if (!['in_progress', 'submitted'].includes(assessment.status)) {
    throw new AppError('Start the assessment before viewing questions.', 409, 'ASSESSMENT_NOT_IN_PROGRESS');
  }
  return serializePublicQuestion(findQuestion(assessment, questionId));
}

export async function getQuestionByIndex(userId, assessmentId, indexValue) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  if (!['in_progress', 'submitted'].includes(assessment.status)) {
    throw new AppError('Start the assessment before viewing questions.', 409, 'ASSESSMENT_NOT_IN_PROGRESS');
  }
  const index = Number(indexValue);
  if (!Number.isInteger(index) || index < 0 || index >= assessment.questions.length) {
    throw new AppError('Question index is out of range.', 404, 'QUESTION_NOT_FOUND');
  }
  return { index, question: serializePublicQuestion(assessment.questions[index]) };
}

export async function saveAnswer(userId, assessmentId, questionId, answerValue) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  ensureInProgress(assessment);
  const question = findQuestion(assessment, questionId);
  const answer = answerValue.trim();
  if (!answer) throw new AppError('Answer is required.', 400, 'VALIDATION_ERROR');
  if (question.type === 'short_answer') {
    if (answer.length > 5_000) throw new AppError('Short answer must not exceed 5,000 characters.', 400, 'VALIDATION_ERROR');
  } else if (!question.options.includes(answerValue)) {
    throw new AppError('Select one of the available options.', 400, 'INVALID_ANSWER_OPTION');
  }

  const existing = assessment.answers.find((item) => item.questionId === questionId);
  const answeredAt = new Date();
  if (existing) {
    existing.answer = question.type === 'short_answer' ? answer : answerValue;
    existing.answeredAt = answeredAt;
  } else {
    assessment.answers.push({ questionId, answer: question.type === 'short_answer' ? answer : answerValue, answeredAt });
  }
  const questionIndex = assessment.questions.findIndex((item) => item.questionId === questionId);
  assessment.currentQuestionIndex = questionIndex;
  await assessment.save();
  return {
    questionId,
    answeredAt,
    answeredCount: assessment.answers.length,
    unansweredCount: assessment.questions.length - assessment.answers.length,
    progressPercentage: Math.round((assessment.answers.length / assessment.questions.length) * 100),
  };
}

export async function updateCurrentPosition(userId, assessmentId, currentQuestionIndex) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  ensureInProgress(assessment);
  if (currentQuestionIndex >= assessment.questions.length) {
    throw new AppError('Question index is out of range.', 400, 'VALIDATION_ERROR');
  }
  assessment.currentQuestionIndex = currentQuestionIndex;
  await assessment.save();
  return { currentQuestionIndex };
}

export async function submitAssessment(userId, assessmentId) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  ensureInProgress(assessment);
  const answeredIds = new Set(assessment.answers.map((answer) => answer.questionId));
  const unanswered = assessment.questions
    .map((question, index) => ({ questionId: question.questionId, index }))
    .filter(({ questionId }) => !answeredIds.has(questionId));
  if (unanswered.length) {
    throw new AppError('Answer every question before submitting.', 409, 'UNANSWERED_QUESTIONS', {
      unansweredCount: unanswered.length,
      unansweredQuestionIds: unanswered.map((item) => item.questionId),
      unansweredIndexes: unanswered.map((item) => item.index),
    });
  }
  assessment.status = 'submitted';
  assessment.submittedAt = new Date();
  await assessment.save();
  return {
    assessmentId: assessment.id,
    status: assessment.status,
    submittedAt: assessment.submittedAt,
    message: 'Assessment submitted successfully. Results will be available after scoring.',
  };
}

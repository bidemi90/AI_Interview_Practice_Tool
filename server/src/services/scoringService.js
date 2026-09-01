import { readinessBand, STRONG_AREA_THRESHOLD, WEAK_AREA_THRESHOLD } from '../config/scoringRules.js';
import { generateQualitativeFeedback, gradeShortAnswer } from './aiGradingService.js';
import { getOwnedAssessment } from './assessmentService.js';
import { AppError } from '../utils/AppError.js';
import { applyAssessmentPerformance } from './userSectionPerformanceService.js';

const objectiveTypes = new Set(['multiple_choice', 'scenario', 'code', 'code_correction']);
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateResultSnapshot(assessment, shortGrades = new Map()) {
  const answers = new Map(assessment.answers.map((answer) => [answer.questionId, answer.answer]));
  const sectionMap = new Map();
  const questionGradings = assessment.questions.map((question) => {
    const userAnswer = answers.get(question.questionId) || '';
    let grading;
    if (objectiveTypes.has(question.type)) {
      const isCorrect = userAnswer.trim() === question.correctAnswer.trim();
      grading = {
        questionId: question.questionId, section: question.section, category: question.category, type: question.type,
        pointsAvailable: question.points, pointsAwarded: isCorrect ? question.points : 0,
        isCorrect, gradingStatus: 'scored',
      };
    } else {
      const shortGrade = shortGrades.get(question.questionId);
      grading = shortGrade ? {
        questionId: question.questionId, section: question.section, category: question.category, type: question.type,
        pointsAvailable: question.points, pointsAwarded: shortGrade.awardedPoints,
        isCorrect: shortGrade.isAcceptable, gradingStatus: 'scored', gradingFeedback: shortGrade.reason,
      } : {
        questionId: question.questionId, section: question.section, category: question.category, type: question.type,
        pointsAvailable: question.points, gradingStatus: 'grading_failed', gradingFeedback: 'Short-answer grading is temporarily unavailable.',
      };
    }
    if (!sectionMap.has(question.section)) sectionMap.set(question.section, {
      section: question.section, category: question.category, totalQuestions: 0, scoredQuestions: 0,
      correctAnswers: 0, incorrectAnswers: 0, earnedPoints: 0, availablePoints: 0,
    });
    const section = sectionMap.get(question.section);
    section.totalQuestions += 1;
    if (grading.gradingStatus === 'scored') {
      section.scoredQuestions += 1;
      section.correctAnswers += grading.isCorrect ? 1 : 0;
      section.incorrectAnswers += grading.isCorrect ? 0 : 1;
      section.earnedPoints += grading.pointsAwarded;
      section.availablePoints += grading.pointsAvailable;
    }
    return grading;
  });
  const sectionScores = [...sectionMap.values()].map((section) => ({
    ...section, earnedPoints: round(section.earnedPoints), availablePoints: round(section.availablePoints),
    percentage: section.availablePoints ? round((section.earnedPoints / section.availablePoints) * 100) : 0,
  }));
  const scored = questionGradings.filter((item) => item.gradingStatus === 'scored');
  const earnedPoints = round(scored.reduce((sum, item) => sum + item.pointsAwarded, 0));
  const availablePoints = round(scored.reduce((sum, item) => sum + item.pointsAvailable, 0));
  const percentageCorrect = availablePoints ? round((earnedPoints / availablePoints) * 100) : 0;
  return {
    totalQuestions: assessment.questions.length,
    scoredQuestions: scored.length,
    correctAnswers: scored.filter((item) => item.isCorrect).length,
    incorrectAnswers: scored.filter((item) => !item.isCorrect).length,
    earnedPoints, availablePoints, percentageCorrect,
    overallReadinessScore: percentageCorrect, readinessBand: readinessBand(percentageCorrect),
    sectionScores,
    strongAreas: sectionScores.filter((item) => item.scoredQuestions && item.percentage >= STRONG_AREA_THRESHOLD).map((item) => item.section),
    weakAreas: sectionScores.filter((item) => item.scoredQuestions && item.percentage < WEAK_AREA_THRESHOLD).map((item) => item.section),
    questionGradings, feedbackStatus: 'pending', scoredAt: new Date(),
  };
}

async function shortAnswerGrades(assessment) {
  const answers = new Map(assessment.answers.map((answer) => [answer.questionId, answer.answer]));
  const grades = new Map();
  for (const question of assessment.questions.filter((item) => item.type === 'short_answer')) {
    try {
      grades.set(question.questionId, await gradeShortAnswer(question, answers.get(question.questionId) || ''));
    } catch (error) {
      console.warn({ code: 'SHORT_ANSWER_GRADING_FAILED', assessmentId: assessment.id, questionId: question.questionId, reason: error.code || 'AI_ERROR' });
    }
  }
  return grades;
}

function feedbackInput(assessment) {
  return {
    jobTitle: assessment.jobSnapshot.jobTitle,
    overallPercentage: assessment.result.percentageCorrect,
    readinessBand: assessment.result.readinessBand,
    sectionScores: assessment.result.sectionScores.map((item) => ({ section: item.section, category: item.category, percentage: item.percentage })),
    strongAreas: assessment.result.strongAreas,
    weakAreas: assessment.result.weakAreas,
  };
}

export async function generateAndSaveFeedback(assessment) {
  try {
    const feedback = await generateQualitativeFeedback(feedbackInput(assessment));
    assessment.result.aiFeedback = feedback;
    assessment.result.feedbackStatus = 'completed';
    assessment.result.feedbackFailureCode = undefined;
    assessment.result.feedbackGeneratedAt = new Date();
  } catch (error) {
    assessment.result.feedbackStatus = 'failed';
    assessment.result.feedbackFailureCode = error.code || 'FEEDBACK_GENERATION_FAILED';
    console.warn({ code: 'FEEDBACK_GENERATION_FAILED', assessmentId: assessment.id, reason: error.code || 'AI_ERROR' });
  }
  await assessment.save();
  return assessment;
}

export async function scoreSubmittedAssessment(userId, assessmentId) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  if (assessment.status !== 'submitted') throw new AppError('Only a submitted assessment can be scored.', 409, 'ASSESSMENT_NOT_SUBMITTED');
  if (assessment.result?.scoredAt) return assessment;
  assessment.result = calculateResultSnapshot(assessment, await shortAnswerGrades(assessment));
  await assessment.save();
  await applyAssessmentPerformance(assessment);
  assessment.result.performanceAggregatedAt = new Date();
  await assessment.save();
  return generateAndSaveFeedback(assessment);
}

export async function getScoredAssessment(userId, assessmentId) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  if (!assessment.result?.scoredAt) throw new AppError('Assessment results are not available yet.', 409, 'ASSESSMENT_NOT_SCORED');
  return assessment;
}

export async function retryAssessmentFeedback(userId, assessmentId) {
  const assessment = await getScoredAssessment(userId, assessmentId);
  if (assessment.result.feedbackStatus === 'completed') return assessment;
  assessment.result.feedbackStatus = 'pending';
  await assessment.save();
  return generateAndSaveFeedback(assessment);
}

export function serializeAssessmentMetadata(assessment) {
  return {
    id: assessment.id,
    jobProfileId: assessment.jobProfileId,
    jobSnapshot: assessment.jobSnapshot,
    mode: assessment.mode,
    status: assessment.status,
    generationProgress: assessment.generationProgress,
    blueprint: assessment.blueprint.map((item) => ({
      section: item.section, category: item.category, questionCount: item.questionCount,
      difficultyDistribution: item.difficultyDistribution, questionTypeDistribution: item.questionTypeDistribution,
      adaptiveInfluenced: Boolean(item.adaptation?.influenced),
    })),
    totalQuestions: assessment.blueprint.reduce((sum, section) => sum + section.questionCount, 0),
    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
  };
}

export function serializeAssessmentSummary(assessment) {
  const totalQuestions = assessment.blueprint.reduce((sum, section) => sum + section.questionCount, 0);
  const answeredQuestionCount = assessment.answers.length;
  return {
    assessmentId: assessment.id,
    jobProfileId: assessment.jobProfileId,
    jobTitle: assessment.jobSnapshot.jobTitle,
    mode: assessment.mode,
    status: assessment.status,
    totalQuestions,
    answeredQuestionCount,
    progressPercentage: totalQuestions ? Math.round((answeredQuestionCount / totalQuestions) * 100) : 0,
    createdAt: assessment.createdAt,
    startedAt: assessment.startedAt,
    submittedAt: assessment.submittedAt,
    hasResult: Boolean(assessment.result?.scoredAt),
    scoredAt: assessment.result?.scoredAt,
    overallScore: assessment.result?.percentageCorrect,
    readinessBand: assessment.result?.readinessBand,
    strongestSection: assessment.result?.sectionScores?.slice().sort((a, b) => b.percentage - a.percentage)[0]?.section,
    weakestSection: assessment.result?.sectionScores?.slice().sort((a, b) => a.percentage - b.percentage)[0]?.section,
  };
}

export function serializeGenerationProgress(assessment) {
  const sections = assessment.generationProgress.sections.map((section) => ({
    name: section.section,
    category: section.category,
    status: section.generationStatus,
    attempts: section.attempts,
    questionCount: section.questionCount,
    generatedQuestionCount: section.generatedQuestionCount,
    ...(section.generationStatus === 'failed' ? { failureCode: section.failureCode } : {}),
  }));
  const completedSections = sections.filter((section) => section.status === 'completed').length;
  return {
    id: assessment.id,
    status: assessment.status,
    totalSections: sections.length,
    completedSections,
    currentSection: assessment.generationProgress.currentSection || null,
    progressPercentage: sections.length ? Math.round((completedSections / sections.length) * 100) : 0,
    sections,
  };
}

export function serializeAssessmentSession(assessment) {
  const totalQuestions = assessment.questions.length;
  const answeredQuestionIds = assessment.answers.map((answer) => answer.questionId);
  return {
    assessmentId: assessment.id,
    jobProfileId: assessment.jobProfileId,
    jobTitle: assessment.jobSnapshot.jobTitle,
    mode: assessment.mode,
    status: assessment.status,
    totalQuestions,
    currentQuestionIndex: assessment.currentQuestionIndex,
    answeredQuestionIds,
    answers: assessment.answers.map((answer) => ({
      questionId: answer.questionId,
      answer: answer.answer,
      answeredAt: answer.answeredAt,
    })),
    answeredCount: answeredQuestionIds.length,
    unansweredCount: totalQuestions - answeredQuestionIds.length,
    progressPercentage: totalQuestions ? Math.round((answeredQuestionIds.length / totalQuestions) * 100) : 0,
    startedAt: assessment.startedAt,
    submittedAt: assessment.submittedAt,
    createdAt: assessment.createdAt,
    sections: assessment.blueprint.map((section) => ({
      section: section.section,
      category: section.category,
      questionCount: section.questionCount,
    })),
    questionNavigation: assessment.questions.map((question, index) => ({
      questionId: question.questionId,
      index,
      section: question.section,
    })),
  };
}

export function serializePublicQuestion(question) {
  return {
    questionId: question.questionId,
    section: question.section,
    category: question.category,
    type: question.type,
    difficulty: question.difficulty,
    question: question.question,
    options: question.options,
    ...(question.codeSnippet ? { codeSnippet: question.codeSnippet } : {}),
  };
}

export function serializeAssessmentResults(assessment) {
  const result = assessment.result;
  return {
    assessmentId: assessment.id, jobProfileId: assessment.jobProfileId,
    jobTitle: assessment.jobSnapshot.jobTitle, mode: assessment.mode,
    submittedAt: assessment.submittedAt,
    totalQuestions: result.totalQuestions, scoredQuestions: result.scoredQuestions,
    correctAnswers: result.correctAnswers, incorrectAnswers: result.incorrectAnswers,
    earnedPoints: result.earnedPoints, availablePoints: result.availablePoints,
    percentageCorrect: result.percentageCorrect,
    overallReadinessScore: result.overallReadinessScore, readinessBand: result.readinessBand,
    sectionScores: result.sectionScores,
    strongAreas: result.strongAreas, weakAreas: result.weakAreas,
    feedbackStatus: result.feedbackStatus,
    ...(result.feedbackStatus === 'completed' ? { aiFeedback: result.aiFeedback } : {}),
    scoredAt: result.scoredAt, feedbackGeneratedAt: result.feedbackGeneratedAt,
  };
}

export function serializeQuestionReview(assessment) {
  const answers = new Map(assessment.answers.map((item) => [item.questionId, item.answer]));
  const gradings = new Map(assessment.result.questionGradings.map((item) => [item.questionId, item]));
  return assessment.questions.map((question, index) => {
    const grading = gradings.get(question.questionId);
    const base = {
      questionNumber: index + 1, questionId: question.questionId,
      section: question.section, type: question.type, question: question.question,
      options: question.options, userAnswer: answers.get(question.questionId) || '',
      gradingStatus: grading.gradingStatus,
      pointsAwarded: grading.pointsAwarded, pointsAvailable: grading.pointsAvailable,
      ...(question.codeSnippet ? { codeSnippet: question.codeSnippet } : {}),
    };
    if (question.type === 'short_answer') return { ...base, gradingFeedback: grading.gradingFeedback };
    return {
      ...base, correctAnswer: question.correctAnswer, isCorrect: grading.isCorrect,
      explanation: question.explanation,
    };
  });
}

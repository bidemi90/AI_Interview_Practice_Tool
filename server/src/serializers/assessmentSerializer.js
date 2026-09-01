export function serializeAssessmentMetadata(assessment) {
  return {
    id: assessment.id,
    jobProfileId: assessment.jobProfileId,
    jobSnapshot: assessment.jobSnapshot,
    mode: assessment.mode,
    status: assessment.status,
    generationProgress: assessment.generationProgress,
    blueprint: assessment.blueprint,
    totalQuestions: assessment.blueprint.reduce((sum, section) => sum + section.questionCount, 0),
    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
  };
}

export function serializeAssessmentSession(assessment) {
  const totalQuestions = assessment.questions.length;
  const answeredQuestionIds = assessment.answers.map((answer) => answer.questionId);
  return {
    assessmentId: assessment.id,
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

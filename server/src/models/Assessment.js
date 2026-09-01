import mongoose from 'mongoose';

const distributionSchema = new mongoose.Schema({}, { _id: false, strict: false });

const blueprintSchema = new mongoose.Schema(
  {
    section: { type: String, required: true },
    category: { type: String, required: true, enum: ['general', 'job_specific'] },
    questionCount: { type: Number, required: true, min: 1 },
    difficultyDistribution: { type: distributionSchema, required: true },
    questionTypeDistribution: { type: distributionSchema, required: true },
    normalizedSectionKey: String,
    baselineQuestionCount: Number,
    adaptation: { type: distributionSchema },
  },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    section: { type: String, required: true },
    category: { type: String, required: true, enum: ['general', 'job_specific'] },
    type: { type: String, required: true, enum: ['multiple_choice', 'scenario', 'code', 'code_correction', 'short_answer'] },
    difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'] },
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    codeSnippet: String,
    correctAnswer: { type: String, required: true },
    acceptableAnswers: [String],
    explanation: { type: String, required: true },
    points: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    answer: { type: String, required: true },
    answeredAt: { type: Date, required: true },
    version: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const sectionGenerationSchema = new mongoose.Schema(
  {
    section: { type: String, required: true },
    category: { type: String, required: true, enum: ['general', 'job_specific'] },
    questionCount: { type: Number, required: true, min: 1 },
    generationStatus: {
      type: String, required: true, enum: ['pending', 'generating', 'retrying', 'completed', 'failed'], default: 'pending',
    },
    attempts: { type: Number, default: 0, min: 0 },
    generatedQuestionCount: { type: Number, default: 0, min: 0 },
    failureCode: String,
  },
  { _id: false },
);

const questionGradingSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  section: { type: String, required: true },
  category: { type: String, required: true, enum: ['general', 'job_specific'] },
  type: { type: String, required: true },
  pointsAvailable: { type: Number, required: true, min: 0 },
  pointsAwarded: { type: Number, min: 0 },
  isCorrect: Boolean,
  gradingStatus: { type: String, required: true, enum: ['scored', 'grading_failed'] },
  gradingFeedback: String,
}, { _id: false });

const sectionScoreSchema = new mongoose.Schema({
  section: { type: String, required: true }, category: { type: String, required: true },
  totalQuestions: { type: Number, required: true }, scoredQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true }, incorrectAnswers: { type: Number, required: true },
  earnedPoints: { type: Number, required: true }, availablePoints: { type: Number, required: true },
  percentage: { type: Number, required: true },
}, { _id: false });

const aiFeedbackSchema = new mongoose.Schema({
  summary: String, strengths: { type: [String], default: [] }, weaknesses: { type: [String], default: [] },
  topicsToRevise: { type: [String], default: [] }, recommendedNextSteps: { type: [String], default: [] },
}, { _id: false });

const resultSchema = new mongoose.Schema({
  totalQuestions: { type: Number, required: true }, scoredQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true }, incorrectAnswers: { type: Number, required: true },
  earnedPoints: { type: Number, required: true }, availablePoints: { type: Number, required: true },
  percentageCorrect: { type: Number, required: true }, overallReadinessScore: { type: Number, required: true },
  readinessBand: { type: String, required: true }, sectionScores: { type: [sectionScoreSchema], default: [] },
  strongAreas: { type: [String], default: [] }, weakAreas: { type: [String], default: [] },
  questionGradings: { type: [questionGradingSchema], default: [] },
  aiFeedback: { type: aiFeedbackSchema },
  feedbackStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  feedbackFailureCode: String, scoredAt: { type: Date, required: true }, feedbackGeneratedAt: Date,
  performanceAggregatedAt: Date,
}, { _id: false });

const assessmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jobProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobProfile', required: true, index: true },
    jobSnapshot: {
      jobTitle: { type: String, required: true },
      sourceType: { type: String, required: true, enum: ['job_description', 'predefined_role'] },
      jobDescription: String,
    },
    mode: { type: String, required: true, enum: ['quick', 'standard', 'full'] },
    status: { type: String, required: true, enum: ['generating', 'ready', 'in_progress', 'submitted', 'generation_failed'], default: 'generating' },
    generationProgress: {
      completedSections: { type: Number, default: 0 },
      totalSections: { type: Number, required: true },
      currentSection: String,
      sections: { type: [sectionGenerationSchema], default: [] },
    },
    blueprint: { type: [blueprintSchema], required: true },
    questions: { type: [questionSchema], default: [] },
    answers: { type: [answerSchema], default: [] },
    currentQuestionIndex: { type: Number, default: 0, min: 0 },
    navigationVersion: { type: Number, default: 0, min: 0 },
    startedAt: Date,
    submittedAt: Date,
    result: { type: resultSchema },
    generationMetadata: {
      provider: String,
      model: String,
      actualModel: String,
      actualProvider: String,
      finishReason: String,
      responseLength: Number,
      batchSize: Number,
      failedSection: String,
      failedBatch: Number,
      failureCode: String,
      generatedAt: Date,
      attempts: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

assessmentSchema.index({ userId: 1, createdAt: -1 });
assessmentSchema.index({ userId: 1, jobProfileId: 1, createdAt: -1 });

export const Assessment = mongoose.model('Assessment', assessmentSchema);

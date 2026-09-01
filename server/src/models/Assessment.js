import mongoose from 'mongoose';

const distributionSchema = new mongoose.Schema({}, { _id: false, strict: false });

const blueprintSchema = new mongoose.Schema(
  {
    section: { type: String, required: true },
    category: { type: String, required: true, enum: ['general', 'job_specific'] },
    questionCount: { type: Number, required: true, min: 1 },
    difficultyDistribution: { type: distributionSchema, required: true },
    questionTypeDistribution: { type: distributionSchema, required: true },
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
  },
  { _id: false },
);

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
    },
    blueprint: { type: [blueprintSchema], required: true },
    questions: { type: [questionSchema], default: [] },
    answers: { type: [answerSchema], default: [] },
    currentQuestionIndex: { type: Number, default: 0, min: 0 },
    startedAt: Date,
    submittedAt: Date,
    generationMetadata: {
      provider: String,
      model: String,
      generatedAt: Date,
      attempts: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

assessmentSchema.index({ userId: 1, createdAt: -1 });

export const Assessment = mongoose.model('Assessment', assessmentSchema);

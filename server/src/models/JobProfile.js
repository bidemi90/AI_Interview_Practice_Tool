import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ['general', 'job_specific'] },
    description: { type: String, required: true, trim: true },
    priority: { type: String, required: true, enum: ['low', 'medium', 'high'] },
    suggestedQuestionTypes: [{
      type: String,
      enum: ['multiple_choice', 'scenario', 'code', 'code_correction', 'short_answer'],
    }],
  },
  { _id: false },
);

const analysisSchema = new mongoose.Schema(
  {
    jobTitle: { type: String, required: true, trim: true },
    mainResponsibilities: { type: [String], default: [] },
    requiredSkills: { type: [String], default: [] },
    technicalSkills: { type: [String], default: [] },
    softSkills: { type: [String], default: [] },
    experienceAreas: { type: [String], default: [] },
    likelyInterviewTopics: { type: [String], default: [] },
    recommendedSections: { type: [sectionSchema], required: true },
  },
  { _id: false },
);

const jobProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceType: { type: String, required: true, enum: ['job_description', 'predefined_role'] },
    predefinedRoleKey: { type: String, trim: true },
    originalJobDescription: { type: String },
    analysis: { type: analysisSchema, required: true },
    analysisVersion: { type: String, required: true, default: '1.0' },
    aiMetadata: {
      provider: { type: String, required: true },
      model: { type: String, required: true },
      generatedAt: { type: Date, required: true },
    },
  },
  { timestamps: true },
);

jobProfileSchema.index({ userId: 1, createdAt: -1 });

export const JobProfile = mongoose.model('JobProfile', jobProfileSchema);

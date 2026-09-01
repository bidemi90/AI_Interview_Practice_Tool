import { z } from 'zod';

export const createAssessmentSchema = z.object({
  jobProfileId: z.string().trim().min(1),
  mode: z.enum(['quick', 'standard', 'full']),
}).strict();

export const saveAnswerSchema = z.object({
  answer: z.string().max(5_000),
  answerVersion: z.number().int().min(0).optional(),
}).strict();

export const updatePositionSchema = z.object({
  currentQuestionIndex: z.number().int().min(0),
  navigationVersion: z.number().int().min(0).optional(),
}).strict();

const questionSchema = z.object({
  section: z.string().trim().min(1).max(100),
  category: z.enum(['general', 'job_specific']),
  type: z.enum(['multiple_choice', 'scenario', 'code', 'code_correction', 'short_answer']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  question: z.string().trim().min(10).max(2_000),
  options: z.array(z.string().trim().min(1).max(500)).max(4),
  codeSnippet: z.string().max(5_000).optional(),
  correctAnswer: z.string().trim().min(1).max(1_000),
  acceptableAnswers: z.array(z.string().trim().min(1).max(500)).max(20).optional(),
  explanation: z.string().trim().min(10).max(2_000),
  points: z.number().int().min(1).max(10),
}).strict();

export const generatedQuestionsSchema = z.object({ questions: z.array(questionSchema) }).strict();

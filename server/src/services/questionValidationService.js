import { generatedQuestionsSchema } from '../validators/assessmentSchemas.js';

const objectiveTypes = new Set(['multiple_choice', 'scenario', 'code', 'code_correction']);

function normalizeQuestionShape(question) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) return question;
  const normalized = { ...question };
  if (normalized.options == null) normalized.options = [];
  else if (!Array.isArray(normalized.options) && typeof normalized.options === 'object') {
    const values = Object.values(normalized.options);
    if (values.every((value) => typeof value === 'string')) normalized.options = values;
  }
  if (normalized.codeSnippet == null || (typeof normalized.codeSnippet === 'string' && !normalized.codeSnippet.trim())) {
    delete normalized.codeSnippet;
  }
  if (normalized.acceptableAnswers == null) delete normalized.acceptableAnswers;
  else if (typeof normalized.acceptableAnswers === 'string') normalized.acceptableAnswers = [normalized.acceptableAnswers];
  if (typeof normalized.points === 'string' && /^\d+$/.test(normalized.points)) normalized.points = Number(normalized.points);
  return normalized;
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.questions)) return payload;
  return { ...payload, questions: payload.questions.map(normalizeQuestionShape) };
}

export function normalizeQuestionText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isNearDuplicate(left, right) {
  if (left === right) return true;
  const leftTokens = new Set(left.split(' '));
  const rightTokens = new Set(right.split(' '));
  if (leftTokens.size < 6 || rightTokens.size < 6) return false;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union >= 0.9;
}

function sameDistribution(questions, key, expected) {
  const actual = {};
  for (const question of questions) actual[question[key]] = (actual[question[key]] || 0) + 1;
  return Object.entries(expected).every(([name, count]) => (actual[name] || 0) === count)
    && Object.keys(actual).every((name) => Object.hasOwn(expected, name));
}

export function validateGeneratedQuestions(rawContent, blueprintSection, existingQuestions = []) {
  if (typeof rawContent !== 'string' || !rawContent.trim()) return { success: false, reason: 'empty_response' };
  let payload;
  try {
    const cleaned = rawContent.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    payload = JSON.parse(cleaned);
  } catch {
    return { success: false, reason: 'invalid_json' };
  }
  const schemaResult = generatedQuestionsSchema.safeParse(normalizePayload(payload));
  if (!schemaResult.success) {
    const issue = schemaResult.error.issues[0];
    return { success: false, reason: `schema:${issue.path.join('.') || 'root'}:${issue.code}` };
  }
  const parsed = schemaResult.data.questions;
  if (parsed.length !== blueprintSection.questionCount) return { success: false, reason: 'incorrect_question_count' };
  if (!sameDistribution(parsed, 'type', blueprintSection.questionTypeDistribution)) return { success: false, reason: 'incorrect_type_distribution' };
  if (!sameDistribution(parsed, 'difficulty', blueprintSection.difficultyDistribution)) return { success: false, reason: 'incorrect_difficulty_distribution' };
  const priorTexts = existingQuestions.map((item) => normalizeQuestionText(item.question));
  const currentTexts = [];
  for (const question of parsed) {
    if (question.section !== blueprintSection.section) return { success: false, reason: 'incorrect_section' };
    if (question.category !== blueprintSection.category) return { success: false, reason: 'incorrect_category' };
    if (objectiveTypes.has(question.type)) {
      if (question.options.length !== 4) return { success: false, reason: 'objective_options_count' };
      if (new Set(question.options.map((option) => option.toLowerCase())).size !== 4) return { success: false, reason: 'duplicate_options' };
      if (!question.options.includes(question.correctAnswer)) return { success: false, reason: 'answer_not_in_options' };
    }
    if (question.type === 'short_answer' && question.options.length !== 0) return { success: false, reason: 'short_answer_has_options' };
    if (question.type === 'short_answer' && !question.acceptableAnswers?.length) return { success: false, reason: 'short_answer_missing_rubric' };
    if (['code', 'code_correction'].includes(question.type) && !question.codeSnippet) return { success: false, reason: 'missing_code_snippet' };
    const normalized = normalizeQuestionText(question.question);
    if ([...priorTexts, ...currentTexts].some((existing) => isNearDuplicate(normalized, existing))) return { success: false, reason: 'duplicate_question' };
    currentTexts.push(normalized);
  }
  return { success: true, data: parsed };
}

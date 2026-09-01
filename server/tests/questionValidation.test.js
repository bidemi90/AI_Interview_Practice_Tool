import { describe, expect, it } from 'vitest';
import { validateGeneratedQuestions } from '../src/services/questionValidationService.js';

function validate(question, type = question.type) {
  return validateGeneratedQuestions(JSON.stringify({ questions: [question] }), {
    section: question.section,
    category: question.category,
    questionCount: 1,
    questionTypeDistribution: { [type]: 1 },
    difficultyDistribution: { [question.difficulty]: 1 },
  });
}

const base = {
  section: 'Collaboration and Communication', category: 'general', type: 'scenario', difficulty: 'medium',
  question: 'How should a team member clarify an ambiguous project requirement?',
  options: ['Ask focused questions', 'Ignore it', 'Guess silently', 'Delay indefinitely'],
  correctAnswer: 'Ask focused questions',
  explanation: 'Focused clarification aligns expectations and prevents avoidable rework.', points: 1,
};

describe('AI question response normalization', () => {
  it('removes an empty codeSnippet placeholder from a non-code question', () => {
    const result = validate({ ...base, codeSnippet: '' });
    expect(result.success).toBe(true);
    expect(result.data[0]).not.toHaveProperty('codeSnippet');
  });

  it('normalizes an A/B/C/D options object into an array', () => {
    const result = validate({
      ...base,
      options: { A: 'Ask focused questions', B: 'Ignore it', C: 'Guess silently', D: 'Delay indefinitely' },
    });
    expect(result.success).toBe(true);
    expect(result.data[0].options).toEqual(base.options);
  });

  it('normalizes short-answer null options, string rubric, and numeric-string points', () => {
    const result = validate({
      ...base, type: 'short_answer', options: null,
      correctAnswer: 'Clarify the requirement with stakeholders.',
      acceptableAnswers: 'Ask relevant stakeholders focused clarifying questions.',
      points: '1',
    });
    expect(result.success).toBe(true);
    expect(result.data[0].options).toEqual([]);
    expect(result.data[0].acceptableAnswers).toEqual(['Ask relevant stakeholders focused clarifying questions.']);
    expect(result.data[0].points).toBe(1);
  });

  it('still rejects missing objective options after normalization', () => {
    const result = validate({ ...base, options: null });
    expect(result).toEqual({ success: false, reason: 'objective_options_count' });
  });
});

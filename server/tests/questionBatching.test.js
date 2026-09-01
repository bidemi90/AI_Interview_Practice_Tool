import { describe, expect, it } from 'vitest';
import { createQuestionBatches } from '../src/services/questionGenerationService.js';

function totalDistribution(batches, key) {
  return batches.reduce((total, batch) => {
    for (const [name, count] of Object.entries(batch[key])) total[name] = (total[name] || 0) + count;
    return total;
  }, {});
}

describe('question generation batching', () => {
  it('splits seven questions into 3, 3, and 1 while preserving the blueprint', () => {
    const section = {
      section: 'Technical Coding Assessment', category: 'job_specific', questionCount: 7,
      questionTypeDistribution: { multiple_choice: 3, code: 2, code_correction: 2 },
      difficultyDistribution: { easy: 2, medium: 3, hard: 2 },
    };
    const batches = createQuestionBatches(section, 3);
    expect(batches.map((batch) => batch.questionCount)).toEqual([3, 3, 1]);
    expect(batches.map((batch) => batch.batchNumber)).toEqual([1, 2, 3]);
    expect(totalDistribution(batches, 'questionTypeDistribution')).toEqual(section.questionTypeDistribution);
    expect(totalDistribution(batches, 'difficultyDistribution')).toEqual(section.difficultyDistribution);
    expect(batches.every((batch) => batch.section === section.section && batch.category === section.category)).toBe(true);
  });
});

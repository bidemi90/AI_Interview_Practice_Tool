import { describe, expect, it } from 'vitest';
import { createAssessmentBlueprint } from '../src/services/assessmentPlanningService.js';

const developerAnalysis = {
  jobTitle: 'Software Developer',
  technicalSkills: ['JavaScript', 'APIs', 'Git'],
  experienceAreas: ['Software development'],
  recommendedSections: [
    { name: 'Communication', category: 'general', priority: 'high', suggestedQuestionTypes: ['multiple_choice', 'scenario'] },
    { name: 'Teamwork', category: 'general', priority: 'medium', suggestedQuestionTypes: ['multiple_choice', 'scenario'] },
    { name: 'Professional Ethics', category: 'general', priority: 'low', suggestedQuestionTypes: ['multiple_choice', 'scenario'] },
    { name: 'Programming Fundamentals', category: 'job_specific', priority: 'high', suggestedQuestionTypes: ['multiple_choice', 'code', 'code_correction'] },
    { name: 'Git', category: 'job_specific', priority: 'high', suggestedQuestionTypes: ['multiple_choice', 'scenario', 'code'] },
    { name: 'APIs', category: 'job_specific', priority: 'medium', suggestedQuestionTypes: ['multiple_choice', 'scenario', 'code'] },
    { name: 'Databases', category: 'job_specific', priority: 'low', suggestedQuestionTypes: ['multiple_choice', 'scenario'] },
  ],
};

const sumQuestions = (blueprint) => blueprint.reduce((sum, section) => sum + section.questionCount, 0);
const sumCategory = (blueprint, category) => blueprint.filter((section) => section.category === category).reduce((sum, section) => sum + section.questionCount, 0);
const sumDistribution = (blueprint, key, value) => blueprint.reduce((sum, section) => sum + (section[key][value] || 0), 0);

describe('assessment blueprint planning', () => {
  it.each([['quick', 15], ['standard', 30], ['full', 48]])('%s totals exactly %i questions', (mode, total) => {
    expect(sumQuestions(createAssessmentBlueprint(developerAnalysis, mode))).toBe(total);
  });

  it.each([['quick', 5, 10], ['standard', 10, 20], ['full', 16, 32]])('%s preserves general and job-specific targets', (mode, general, specific) => {
    const blueprint = createAssessmentBlueprint(developerAnalysis, mode);
    expect(sumCategory(blueprint, 'general')).toBe(general);
    expect(sumCategory(blueprint, 'job_specific')).toBe(specific);
  });

  it('weights high-priority sections above low-priority sections', () => {
    const blueprint = createAssessmentBlueprint(developerAnalysis, 'full');
    const count = (name) => blueprint.find((section) => section.section === name).questionCount;
    expect(count('Programming Fundamentals')).toBeGreaterThan(count('Databases'));
    expect(count('Communication')).toBeGreaterThan(count('Professional Ethics'));
  });

  it.each([
    ['quick', { easy: 6, medium: 8, hard: 1 }],
    ['standard', { easy: 9, medium: 15, hard: 6 }],
    ['full', { easy: 12, medium: 24, hard: 12 }],
  ])('%s has exact deterministic difficulty totals', (mode, expected) => {
    const blueprint = createAssessmentBlueprint(developerAnalysis, mode);
    for (const [level, count] of Object.entries(expected)) expect(sumDistribution(blueprint, 'difficultyDistribution', level)).toBe(count);
  });

  it('allocates question types to exactly each section count and favors objective types', () => {
    const blueprint = createAssessmentBlueprint(developerAnalysis, 'standard');
    for (const section of blueprint) {
      expect(Object.values(section.questionTypeDistribution).reduce((sum, count) => sum + count, 0)).toBe(section.questionCount);
    }
    const objective = sumDistribution(blueprint, 'questionTypeDistribution', 'multiple_choice') + sumDistribution(blueprint, 'questionTypeDistribution', 'scenario');
    expect(objective).toBeGreaterThanOrEqual(24);
  });

  it('allows practical code questions for a programming role', () => {
    const blueprint = createAssessmentBlueprint(developerAnalysis, 'standard');
    const codeQuestions = sumDistribution(blueprint, 'questionTypeDistribution', 'code') + sumDistribution(blueprint, 'questionTypeDistribution', 'code_correction');
    expect(codeQuestions).toBeGreaterThan(0);
  });

  it('never assigns code questions to general sections, even for a programming role', () => {
    const analysisWithGeneralDebugging = {
      ...developerAnalysis,
      recommendedSections: [
        ...developerAnalysis.recommendedSections,
        { name: 'Problem Solving and Debugging', category: 'general', priority: 'high', suggestedQuestionTypes: ['scenario', 'code_correction'] },
      ],
    };
    const blueprint = createAssessmentBlueprint(analysisWithGeneralDebugging, 'quick');
    const general = blueprint.filter((section) => section.category === 'general');
    expect(sumDistribution(general, 'questionTypeDistribution', 'code')).toBe(0);
    expect(sumDistribution(general, 'questionTypeDistribution', 'code_correction')).toBe(0);
  });

  it('removes code questions from a non-programming role even if suggested', () => {
    const accountant = {
      ...developerAnalysis,
      jobTitle: 'Accountant', technicalSkills: ['Excel', 'Bookkeeping'], experienceAreas: ['Financial reporting'],
      recommendedSections: developerAnalysis.recommendedSections.map((section) => ({ ...section, name: section.category === 'job_specific' ? `Accounting ${section.name}` : section.name })),
    };
    const blueprint = createAssessmentBlueprint(accountant, 'standard');
    expect(sumDistribution(blueprint, 'questionTypeDistribution', 'code')).toBe(0);
    expect(sumDistribution(blueprint, 'questionTypeDistribution', 'code_correction')).toBe(0);
  });
});

# Phase 6: adaptive learning

Section names are normalized to lowercase snake case, while their latest human-readable name is retained for display.

Long-term performance is point weighted:

`averagePercentage = totalPointsEarned / totalPointsAvailable * 100`

`proficiencyScore` equals that average in V1. The raw weakness weight is `1 + (100 - proficiencyScore) / 100`, clamped to 1.0–2.0. Evidence scaling applies 25% of the adjustment after one attempt, 50% after two attempts, and the full adjustment after three or more attempts.

Planning multiplies the existing priority weight by the effective weakness weight. It only reallocates inside the existing general/job-specific totals, maintains minimum coverage when possible, caps a section at about 35% of its category allocation, and is deterministic for identical inputs. Stored blueprint metadata keeps both baseline and adaptive allocations for development diagnostics; normal APIs expose only the planned counts and a simple adaptive indicator.

Performance aggregation uses stored scoring snapshots and an internal processed-assessment ledger. AI feedback is not part of this path. Rebuild all existing scored-assessment aggregates with:

```bash
npm run rebuild-performance
```

The rebuild deletes only derived `UserSectionPerformance` records and recreates them chronologically from persistent assessment result snapshots, so it is safe to rerun.

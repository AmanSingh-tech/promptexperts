import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak, countedRuns, dayKey, earnedAchievements, nextDayStart } from '../lib/game.js';

const none = { evaluated: [], runs: [], podiums: [] };
const day1 = new Date('2026-10-01T10:00:00Z');
const run = (over) => ({ date: day1, solutionScore: 50, aiUsageScore: 50, finalScore: 50, difficulty: 'EASY', category: 'ALGORITHMS', ...over });
const keys = (facts) => [...earnedAchievements(facts).keys()];
const streakRun = (day, over) => ({ problemId: day, date: new Date(`${day}T10:00:00Z`), day, daily: false, confirmed: true, ...over });
const solve = (problemId, day, status = 'ACCEPTED', evaluation = null) => ({ problemId, status, evaluation, submittedAt: `${day}T10:00:00Z` });

test('days use UTC and reset at the next UTC midnight', () => {
  assert.equal(dayKey('2026-11-01T23:59:59Z'), '2026-11-01');
  assert.equal(dayKey('2026-11-02T00:00:00+05:30'), '2026-11-01');
  assert.equal(nextDayStart(new Date('2026-11-01T23:59:59Z')).toISOString(), '2026-11-02T00:00:00.000Z');
  assert.equal(nextDayStart(new Date('2026-11-01T00:00:00Z')).toISOString(), '2026-11-02T00:00:00.000Z');
});

test('no submissions means no streak', () => {
  assert.deepEqual(computeStreak([], '2026-11-01'), { current: 0, best: 0, activeToday: false });
});

test('consecutive days count once each, in any order', () => {
  assert.deepEqual(computeStreak(['2026-11-01', '2026-10-30', '2026-10-31', '2026-11-01'], '2026-11-01'), { current: 3, best: 3, activeToday: true });
});

test('a streak stays alive through the next day, then ends', () => {
  const days = ['2026-10-30', '2026-10-31'];
  assert.deepEqual(computeStreak(days, '2026-11-01'), { current: 2, best: 2, activeToday: false });
  assert.deepEqual(computeStreak(days, '2026-11-02'), { current: 0, best: 2, activeToday: false });
});

test('a gap restarts the current streak and keeps the best', () => {
  assert.deepEqual(computeStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-31', '2026-11-01'], '2026-11-01'), { current: 2, best: 3, activeToday: true });
});

test('streaks cross month and year ends', () => {
  assert.equal(computeStreak(['2026-12-31', '2027-01-01'], '2027-01-01').current, 2);
});

test('failed attempts never count', () => {
  assert.deepEqual(countedRuns([solve('a', '2026-11-01', 'WRONG_ANSWER')]), []);
});

test('resubmitting a challenge only counts on the day it is the daily', () => {
  const solves = [solve('a', '2026-10-30'), solve('a', '2026-10-31'), solve('a', '2026-11-01')];
  assert.deepEqual(countedRuns(solves).map((r) => r.day), ['2026-10-30']);
  const runs = countedRuns(solves, [{ date: '2026-11-01', problemId: 'a' }]);
  assert.deepEqual(runs.map((r) => [r.day, r.daily]), [['2026-10-30', false], ['2026-11-01', true]]);
});

test('written answers count unconfirmed, then stay or drop with the review', () => {
  const pending = solve('w', '2026-11-01', 'MANUAL_REVIEW');
  assert.equal(countedRuns([pending])[0].confirmed, false);
  assert.equal(countedRuns([{ ...pending, evaluation: { status: 'DISPUTED', solutionScore: 10 } }])[0].confirmed, false);
  assert.equal(countedRuns([{ ...pending, evaluation: { status: 'FINAL', solutionScore: 50 } }])[0].confirmed, true);
  assert.deepEqual(countedRuns([{ ...pending, evaluation: { status: 'FINAL', solutionScore: 49 } }]), []);
});

test('a rejected written answer does not use up the challenge', () => {
  const junk = solve('w', '2026-10-31', 'MANUAL_REVIEW', { status: 'FINAL', solutionScore: 5 });
  const retry = solve('w', '2026-11-01', 'MANUAL_REVIEW', { status: 'FINAL', solutionScore: 80 });
  assert.deepEqual(countedRuns([retry, junk]).map((r) => r.day), ['2026-11-01']);
});

test('nothing is earned with no activity', () => {
  assert.deepEqual(keys(none), []);
});

test('achievement thresholds', () => {
  assert.deepEqual(keys({ ...none, evaluated: [run()] }), ['first-run']);
  assert.ok(keys({ ...none, evaluated: [run({ aiUsageScore: 100 })] }).includes('prompt-master'));
  assert.ok(!keys({ ...none, evaluated: [run({ solutionScore: 100, finalScore: 89 })] }).includes('flawless'));
  assert.ok(keys({ ...none, evaluated: [run({ solutionScore: 100, finalScore: 90 })] }).includes('flawless'));
  assert.ok(!keys({ ...none, evaluated: [run({ difficulty: 'MEDIUM', finalScore: 95 })] }).includes('hard-mode'));
  assert.ok(keys({ ...none, evaluated: [run({ difficulty: 'HARD', finalScore: 75 })] }).includes('hard-mode'));
  assert.ok(keys({ ...none, evaluated: [run(), run({ category: 'WEB_DEV' }), run({ category: 'SYSTEM_DESIGN' })] }).includes('all-rounder'));
  assert.deepEqual(keys({ ...none, podiums: [day1] }), ['podium']);
});

test('earned dates are when each threshold was actually reached', () => {
  const later = new Date('2026-10-05T10:00:00Z');
  const earned = earnedAchievements({ ...none, evaluated: [run({ date: later, aiUsageScore: 100 }), run()], podiums: [] });
  assert.deepEqual(earned.get('first-run'), day1);
  assert.deepEqual(earned.get('prompt-master'), later);
  const streak = earnedAchievements({ ...none, runs: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((d) => streakRun(d)) });
  assert.deepEqual(streak.get('streak-3'), new Date('2026-10-03T10:00:00Z'));
});

test('unconfirmed runs show in a streak but cannot earn permanent achievements', () => {
  const runs = ['2026-10-01', '2026-10-02', '2026-10-03'].map((d) => streakRun(d, { confirmed: false }));
  assert.deepEqual(keys({ ...none, runs }), []);
  assert.deepEqual(keys({ ...none, runs: runs.map((r) => ({ ...r, confirmed: true })) }), ['streak-3']);
});

test('daily clears count distinct days', () => {
  const days = ['2026-10-01', '2026-10-03', '2026-10-05', '2026-10-07'];
  const runs = days.map((d) => streakRun(d, { daily: true }));
  assert.deepEqual(keys({ ...none, runs: [...runs, runs[0]] }), []);
  assert.deepEqual(keys({ ...none, runs: [...runs, streakRun('2026-10-09', { daily: true })] }), ['daily-5']);
});

test('a season medal is earned on the date the season ended', () => {
  const ended = new Date('2026-10-31T00:00:00Z');
  const earned = earnedAchievements({ ...none, seasonPodiums: [ended] });
  assert.deepEqual([...earned], [['season-podium', ended]]);
  assert.equal(keys(none).includes('season-podium'), false);
});

import { clampPercent, percentOf, formatHours } from '../utils/taskUtils';

describe('taskUtils', () => {
  test('clampPercent clamps values', () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(50)).toBe(50);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(NaN)).toBe(0);
  });

  test('percentOf handles zero or missing estimate', () => {
    expect(percentOf(5, 0)).toBe(0);
    expect(percentOf(5, null)).toBe(0);
    expect(percentOf(0, 10)).toBe(0);
  });

  test('percentOf rounds to nearest integer and clamps', () => {
    expect(percentOf(5, 10)).toBe(50);
    expect(percentOf(11, 10)).toBe(100);
  });

  test('formatHours prints hours or dash', () => {
    expect(formatHours(5)).toBe('5h');
    expect(formatHours('2')).toBe('2h');
    expect(formatHours(undefined)).toBe('—');
  });
});

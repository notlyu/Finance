import { formatMoney } from './format';

describe('formatMoney', () => {
const NBSP = '\u00a0';

  it('formats positive integers', () => {
    expect(formatMoney(0)).toBe('0');
    expect(formatMoney(1)).toBe('1');
    expect(formatMoney(1000)).toBe(`1${NBSP}000`);
    expect(formatMoney(1234567)).toBe(`1${NBSP}234${NBSP}567`);
  });

  it('formats negative values', () => {
    expect(formatMoney(-1)).toBe('-1');
    expect(formatMoney(-1000)).toBe(`-1${NBSP}000`);
    expect(formatMoney(-500000)).toBe(`-500${NBSP}000`);
  });

  it('truncates fractional numbers', () => {
    expect(formatMoney(1234.567)).toBe(`1${NBSP}234`);
    expect(formatMoney(1234.999)).toBe(`1${NBSP}234`);
    expect(formatMoney(0.9)).toBe('0');
    expect(formatMoney(-0.9)).toBe('-0');
  });

  it('handles string input', () => {
    expect(formatMoney('1000')).toBe(`1${NBSP}000`);
    expect(formatMoney('500000')).toBe(`500${NBSP}000`);
    expect(formatMoney('1234.567')).toBe(`1${NBSP}234`);
    expect(formatMoney('-1000')).toBe(`-1${NBSP}000`);
  });

  it('returns "0" for non-finite values', () => {
    expect(formatMoney(NaN)).toBe('0');
    expect(formatMoney(Infinity)).toBe('0');
    expect(formatMoney(-Infinity)).toBe('0');
  });

  it('returns "0" for invalid string input', () => {
    expect(formatMoney('abc')).toBe('0');
    expect(formatMoney('')).toBe('0');
    expect(formatMoney('12abc')).toBe('0');
  });

  it('returns "0" for null and undefined', () => {
    expect(formatMoney(null)).toBe('0');
    expect(formatMoney(undefined)).toBe('0');
  });

  it('returns "0" for objects and arrays', () => {
    expect(formatMoney({})).toBe('0');
    expect(formatMoney([])).toBe('0');
  });
});

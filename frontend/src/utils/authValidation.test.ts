import { describe, expect, it } from 'vitest';
import {
  getPasswordStrength,
  isValidEmail,
  meetsMinimumLength,
  normalizeEmail,
} from './authValidation';

describe('getPasswordStrength', () => {
  it('returns an empty state for an empty password', () => {
    expect(getPasswordStrength('')).toEqual({ score: 0, label: '', tone: null });
  });

  it('rates short, simple passwords as weak', () => {
    const result = getPasswordStrength('abc');
    expect(result.label).toBe('Weak');
    expect(result.tone).toBe('danger');
    expect(result.score).toBeLessThan(35);
  });

  it('improves as length and character variety grow', () => {
    const fair = getPasswordStrength('abcdef');
    const good = getPasswordStrength('Abcdef12');
    const strong = getPasswordStrength('Abcdef12!longer');

    expect(fair.label).toBe('Fair');
    expect(good.label).toBe('Good');
    expect(strong.label).toBe('Strong');
    expect(strong.score).toBe(100);
  });
});

describe('meetsMinimumLength', () => {
  it('counts characters without trimming the password', () => {
    expect(meetsMinimumLength('123456', 6)).toBe(true);
    expect(meetsMinimumLength('12345', 6)).toBe(false);
    expect(meetsMinimumLength('  1234 ', 6)).toBe(true);
  });
});

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmail('admin@acme.com')).toBe(true);
    expect(isValidEmail('  reader+dashboards@sub.example.co.uk  ')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('admin')).toBe(false);
    expect(isValidEmail('admin@acme')).toBe(false);
    expect(isValidEmail('admin @acme.com')).toBe(false);
    expect(isValidEmail('@acme.com')).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases the address', () => {
    expect(normalizeEmail('  Admin@Acme.COM ')).toBe('admin@acme.com');
  });
});

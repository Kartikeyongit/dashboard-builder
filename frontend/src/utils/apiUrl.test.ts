import { describe, expect, it } from 'vitest';
import { apiBaseToWsBase, DEFAULT_API_BASE, normalizeApiBase } from './apiUrl';

describe('normalizeApiBase', () => {
  it('uses the local default when unset', () => {
    expect(normalizeApiBase(undefined)).toBe(DEFAULT_API_BASE);
    expect(normalizeApiBase('')).toBe(DEFAULT_API_BASE);
    expect(normalizeApiBase('   ')).toBe(DEFAULT_API_BASE);
  });

  it('appends /api/v1 to an origin', () => {
    expect(normalizeApiBase('https://api.example.com')).toBe('https://api.example.com/api/v1');
    expect(normalizeApiBase('https://api.example.com/')).toBe('https://api.example.com/api/v1');
  });

  it('keeps an existing /api/v1 suffix', () => {
    expect(normalizeApiBase('https://api.example.com/api/v1')).toBe('https://api.example.com/api/v1');
    expect(normalizeApiBase('https://api.example.com/api/v1/')).toBe('https://api.example.com/api/v1');
    expect(normalizeApiBase('http://localhost:8080/api/v1')).toBe('http://localhost:8080/api/v1');
  });
});

describe('apiBaseToWsBase', () => {
  it('converts http schemes to ws and strips the API path', () => {
    expect(apiBaseToWsBase('http://localhost:8080/api/v1')).toBe('ws://localhost:8080');
    expect(apiBaseToWsBase('https://api.example.com/api/v1')).toBe('wss://api.example.com');
  });
});

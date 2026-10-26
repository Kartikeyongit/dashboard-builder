import { describe, expect, it } from 'vitest';
import { canEditContent } from './permissions';
import type { User } from '../types';

function user(role: string): User {
  return {
    id: 'u1',
    org_id: 'o1',
    email: 'user@example.com',
    role,
    created_at: '2026-01-01T00:00:00Z',
  };
}

describe('canEditContent', () => {
  it('allows admins and editors', () => {
    expect(canEditContent(user('admin'))).toBe(true);
    expect(canEditContent(user('editor'))).toBe(true);
  });

  it('blocks viewers and unknown roles', () => {
    expect(canEditContent(user('viewer'))).toBe(false);
    expect(canEditContent(user('owner'))).toBe(false);
  });

  it('blocks missing users', () => {
    expect(canEditContent(null)).toBe(false);
    expect(canEditContent(undefined)).toBe(false);
  });
});

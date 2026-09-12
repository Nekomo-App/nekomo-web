import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';

// next/headers is imported by auth.ts but only invoked inside request scopes.
import { checkAdminKey, createAdminToken, verifyAdminToken } from '@/lib/auth';
import { maskSecret } from '@/lib/admin/store';

describe('admin auth', () => {
  it('accepts the dev fallback key in non-production', () => {
    expect(checkAdminKey('dev-admin-key')).toBe(true);
  });

  it('rejects wrong keys', () => {
    expect(checkAdminKey('wrong')).toBe(false);
    expect(checkAdminKey('')).toBe(false);
    expect(checkAdminKey('dev-admin-keyy')).toBe(false);
  });

  it('round-trips a signed token', () => {
    const token = createAdminToken();
    expect(verifyAdminToken(token)).toBe(true);
  });

  it('rejects tampered tokens', () => {
    const token = createAdminToken();
    const [role, exp] = token.split('.');
    expect(verifyAdminToken(`${role}.${exp}.forgedsignature`)).toBe(false);
    expect(verifyAdminToken(`user.${exp}.${token.split('.')[2]}`)).toBe(false);
    expect(verifyAdminToken(undefined)).toBe(false);
    expect(verifyAdminToken('')).toBe(false);
  });

  it('rejects expired tokens', () => {
    const expired = Date.now() - 1000;
    const sig = crypto
      .createHmac('sha256', 'dev-only-secret')
      .update(`admin.${expired}`)
      .digest('hex');
    expect(verifyAdminToken(`admin.${expired}.${sig}`)).toBe(false);
  });
});

describe('credential masking', () => {
  it('never returns the raw secret', () => {
    expect(maskSecret('supersecretapikey')).toBe('••••ikey');
    expect(maskSecret('ab')).toBe('••••');
    expect(maskSecret(undefined)).toBeUndefined();
  });
});

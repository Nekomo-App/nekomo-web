import { describe, expect, it } from 'vitest';
import { validateExternalUrl } from '@/lib/ssrf';

// NODE_ENV is 'test' in vitest → HTTP is permitted for these checks.
describe('SSRF guard', () => {
  it.each([
    'http://localhost:8080/x',
    'http://127.0.0.1/admin',
    'http://10.0.0.5/',
    'http://192.168.1.10/',
    'http://172.16.0.1/',
    'http://169.254.169.254/latest/meta-data', // AWS metadata
    'http://[::1]/',
    'http://0.0.0.0/',
    'http://metadata.google.internal/',
    'http://foo.internal/x',
  ])('rejects internal target %s', async (url) => {
    const res = await validateExternalUrl(url);
    expect(res.ok).toBe(false);
  });

  it('rejects credentials in URLs', async () => {
    const res = await validateExternalUrl('http://user:pass@8.8.8.8/');
    expect(res.ok).toBe(false);
  });

  it('rejects malformed URLs', async () => {
    const res = await validateExternalUrl('not a url');
    expect(res.ok).toBe(false);
  });

  it('accepts a public IP', async () => {
    const res = await validateExternalUrl('https://140.82.121.4/');
    expect(res.ok).toBe(true);
  });

  it('accepts a public hostname (api.jikan.moe resolves publicly)', async () => {
    const res = await validateExternalUrl('https://api.jikan.moe/v4');
    expect(res.ok).toBe(true);
  });
});

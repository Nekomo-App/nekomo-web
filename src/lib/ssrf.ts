import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * SSRF protection for admin-configured URLs (sources / API integrations).
 * Validates scheme, hostname, and resolved IPs before the server fetches them.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'instance-data',
  'metadata',
]);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) || // link-local / cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    a >= 224 // multicast/reserved
  );
}

function isPrivateIPv6(ip: string): boolean {
  const n = ip.toLowerCase();
  return (
    n === '::' ||
    n === '::1' ||
    n.startsWith('fe80') ||
    n.startsWith('fc') ||
    n.startsWith('fd') ||
    n.startsWith('::ffff:0:0:0') ||
    (n.startsWith('::ffff:') && isPrivateIPv4(n.slice(7)))
  );
}

function isPrivateIP(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) return isPrivateIPv4(ip);
  if (kind === 6) return isPrivateIPv6(ip);
  return true; // unknown — block
}

export interface UrlCheck {
  ok: boolean;
  url?: URL;
  error?: string;
}

/**
 * Validate an admin-supplied base URL. HTTPS required in production;
 * HTTP allowed only outside production for local development integrations.
 */
export async function validateExternalUrl(raw: string): Promise<UrlCheck> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }

  const isProd = process.env.NODE_ENV === 'production';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && !isProd)) {
    return { ok: false, error: 'Only HTTPS URLs are allowed in production' };
  }
  if (url.username || url.password) {
    return { ok: false, error: 'Credentials in URLs are not allowed' };
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.internal') || host.endsWith('.local')) {
    return { ok: false, error: 'Internal hostnames are not allowed' };
  }

  // Literal IP in hostname
  if (net.isIP(host)) {
    if (isPrivateIP(host)) return { ok: false, error: 'Private/internal IP addresses are not allowed' };
    return { ok: true, url };
  }

  // Resolve DNS and check every resolved address
  try {
    const records = await dns.lookup(host, { all: true });
    if (!records.length) return { ok: false, error: 'Hostname does not resolve' };
    if (records.some((r) => isPrivateIP(r.address))) {
      return { ok: false, error: 'Hostname resolves to a private/internal address' };
    }
  } catch {
    return { ok: false, error: 'Could not resolve hostname' };
  }

  return { ok: true, url };
}

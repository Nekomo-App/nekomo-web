const isProd = process.env.NODE_ENV === 'production';

// Content-Security-Policy: allow exactly what the app uses —
// self scripts + Next inline bootstrap, inline styles (Tailwind/generated art),
// Google Fonts, Jikan/YouTube images, YouTube embeds, same-origin fetches +
// the metadata API, and same-origin/HTTPS media for licensed streams.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'", // Next.js emits inline bootstrap scripts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://api.jikan.moe",
  "media-src 'self' https:",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  // HSTS only when actually deployed over HTTPS
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;

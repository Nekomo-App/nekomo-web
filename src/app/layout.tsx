import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Toaster } from '@/components/Toaster';
import { ScrollToTop } from '@/components/ScrollToTop';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SiteGate } from '@/components/SiteGate';
import { ErrorReporter } from '@/components/ErrorReporter';

export const metadata: Metadata = {
  title: { default: 'Nekomo — Discover your next story', template: '%s · Nekomo' },
  description:
    'Nekomo is an anime discovery platform with legally authorized streaming. Browse, track, and watch from official sources.',
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  applicationName: 'Nekomo',
  openGraph: {
    siteName: 'Nekomo',
    title: 'Nekomo — Discover your next story',
    description:
      'Anime discovery and legally authorized streaming. Browse, track, and watch from official sources.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nekomo — Discover your next story',
    description: 'Anime discovery and legally authorized streaming.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#100A12',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Apply persisted theme before first paint to avoid flashing the wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=JSON.parse(localStorage.getItem('nekomo-store')||'{}').state||{};var t=s.theme||{};var m=t.mode||'dark';var r=m==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):m;var e=document.documentElement;e.dataset.theme=r;e.dataset.accent=t.accent||'pink';e.dataset.bg=t.bg||'default';e.dataset.card=t.card||'default';e.dataset.density=t.density||'comfortable';e.dataset.blur=t.blur===false?'off':'on';e.dataset.motion=(s.reducedMotion||t.animations===false)?'reduced':'full';e.style.setProperty('--font-scale',{small:'14.5px',large:'17.5px'}[t.fontSize]||'16px');}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
            <SiteGate>{children}</SiteGate>
            <ErrorReporter />
          </main>
          <Footer dmcaEmail={process.env.DMCA_CONTACT_EMAIL} />
          <Toaster />
          <ScrollToTop />
        </ThemeProvider>
      </body>
    </html>
  );
}

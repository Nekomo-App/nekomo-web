import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Toaster } from '@/components/Toaster';
import { ScrollToTop } from '@/components/ScrollToTop';
import { MotionProvider } from '@/components/MotionProvider';

export const metadata: Metadata = {
  title: { default: 'Nekomō — Discover your next story', template: '%s · Nekomō' },
  description:
    'Nekomō is an anime discovery platform with legally authorized streaming. Browse, track, and watch from official sources.',
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
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
      </head>
      <body className="min-h-screen flex flex-col">
        <MotionProvider>
          <Navbar />
          <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
          <Footer />
          <Toaster />
          <ScrollToTop />
        </MotionProvider>
      </body>
    </html>
  );
}

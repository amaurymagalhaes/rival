import type { Metadata } from 'next';
import { IBM_Plex_Mono, Sora, Source_Serif_4 } from 'next/font/google';
import { Header } from '@/components/Header';
import './globals.css';

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
});

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: {
    default: 'HyperBlog',
    template: '%s | HyperBlog',
  },
  description: 'Write. Publish. Get read.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sora.variable} ${sourceSerif.variable} ${plexMono.variable} overflow-x-hidden`}
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div className="relative min-h-screen">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[22rem] bg-[radial-gradient(75%_75%_at_50%_0%,oklch(0.93_0.08_235/45%),transparent)]" />
          <Header />
          <div id="main-content" className="relative pb-20">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}

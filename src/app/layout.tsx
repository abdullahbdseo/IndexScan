import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IndexCheck — Check Which URLs Are Indexed on Google',
  description:
    'API-free SEO tool to check which URLs from your website sitemap are publicly observable in Google search results. No Google Search Console API, no login, no API keys.',
  keywords: [
    'Google index checker',
    'sitemap index checker',
    'SEO indexation rate',
    'check indexed URLs',
    'bulk URL index checker',
    'free SEO tool',
    'Google observable index rate',
  ],
  authors: [{ name: 'IndexCheck' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-50 flex flex-col antialiased selection:bg-blue-500 selection:text-white transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}

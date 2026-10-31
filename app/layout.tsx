import type { Metadata } from 'next'
import { Poppins, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { VisitorAnalytics } from './components/VisitorAnalytics'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-poppins',
})
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'SidelinePro | The operating system for Australian community sport',
  description: 'Connect grading, team formation, umpire rostering, coaching and player development with PlayHQ workflows. Built around Australian community sport.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-AU" className={`scroll-smooth bg-white ${poppins.variable}`}>
      <body className={`${poppins.className} font-sans antialiased bg-white text-[#1d1d1f]`}>
        {children}
        {process.env.NODE_ENV === 'production' && <VisitorAnalytics />}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

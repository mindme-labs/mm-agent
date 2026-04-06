import React from 'react'
import { Inter } from 'next/font/google'
import type { Viewport } from 'next'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata = {
  title: 'MMLabs — Управление оборотным капиталом',
  description: 'Проактивный AI-агент для управления оборотным капиталом оптовых компаний',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}

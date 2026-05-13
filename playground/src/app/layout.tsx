import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FamScript Playground',
  description: 'Interactive editor for FamScript declarative relationship diagrams',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

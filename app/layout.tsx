import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'キッチンラボ シフト管理',
  description: 'キッチンラボ スタッフ用シフト管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white">
        {children}
      </body>
    </html>
  )
}

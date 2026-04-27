'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BottomNavProps {
  staffId: string
}

const navItems = [
  { label: 'ホーム', icon: '🏠', path: '' },
  { label: 'シフト提出', icon: '📅', path: '/calendar' },
  { label: '確定シフト', icon: '✅', path: '/schedule' },
  { label: 'テンプレ', icon: '⚙️', path: '/templates' },
]

export default function BottomNav({ staffId }: BottomNavProps) {
  const pathname = usePathname()
  const base = `/staff/${staffId}`

  return (
    <nav className="sticky bottom-0 bg-white border-t border-gray-200 flex pb-3">
      {navItems.map((item) => {
        const href = `${base}${item.path}`
        const isActive = item.path === ''
          ? pathname === base
          : pathname.startsWith(`${base}${item.path}`)
        return (
          <Link
            key={item.path}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 pt-2 text-xs ${
              isActive ? 'text-brand-dark font-bold' : 'text-gray-400'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

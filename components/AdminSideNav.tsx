import Link from 'next/link'
import { logoutAdmin } from '@/app/admin/actions'

const navItems = [
  { href: '/admin', label: 'ダッシュボード', icon: '📅' },
  { href: '/admin/offers', label: 'ヘルプミー', icon: '📢' },
  { href: '/admin/points', label: 'ポイント管理', icon: '⭐' },
  { href: '/admin/settings', label: '設定', icon: '⚙️' },
]

export default function AdminSideNav() {
  return (
    <aside className="w-48 bg-brand-dark text-white min-h-screen flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-white/10">
        <h1 className="text-brand-gold font-bold text-sm">Kitchen Lab</h1>
        <p className="text-gray-400 text-xs mt-0.5">管理者</p>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        <form action={logoutAdmin}>
          <button
            type="submit"
            className="w-full text-left text-xs text-gray-400 hover:text-white transition-colors"
          >
            ログアウト
          </button>
        </form>
      </div>
    </aside>
  )
}

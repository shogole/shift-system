import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TopPage() {
  const supabase = createClient()
  const { data: staffs } = await supabase
    .from('staffs')
    .select('id, name')
    .order('created_at')

  return (
    <div className="max-w-sm mx-auto min-h-screen">
      <div className="bg-brand-dark text-white text-center py-12 px-4">
        <h1 className="text-3xl font-bold text-brand-gold">Kitchen Lab</h1>
        <p className="text-gray-400 text-sm mt-2">シフト管理システム</p>
      </div>
      <div className="p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
          名前を選んでください
        </p>
        <div className="grid grid-cols-2 gap-3">
          {staffs?.map((staff) => (
            <Link
              key={staff.id}
              href={`/staff/${staff.id}`}
              className="border-2 border-gray-200 rounded-xl p-4 text-center font-bold text-gray-700 hover:border-brand-gold hover:bg-amber-50 transition-colors"
            >
              {staff.name}
            </Link>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/admin/login" className="text-xs text-gray-300 hover:text-gray-500">
            管理者
          </Link>
        </div>
      </div>
    </div>
  )
}

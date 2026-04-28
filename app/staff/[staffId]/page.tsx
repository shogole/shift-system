import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function StaffHome({
  params,
}: {
  params: { staffId: string }
}) {
  const supabase = createClient()
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`

  const { data: requests } = await supabase
    .from('shift_requests')
    .select('status')
    .eq('staff_id', params.staffId)
    .gte('date', monthStart)
    .lte('date', monthEnd)

  const totalRequests = requests?.length ?? 0
  const confirmedCount = requests?.filter(r => r.status === 'confirmed').length ?? 0

  const { data: points } = await supabase
    .from('points')
    .select('amount')
    .eq('staff_id', params.staffId)
    .eq('approved', true)

  const totalPoints = points?.reduce((sum, p) => sum + p.amount, 0) ?? 0

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, message, type, created_at')
    .or(`staff_id.eq.${params.staffId},staff_id.is.null`)
    .eq('is_read', false)
    .eq('type', 'offer')
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="p-4">
      {notifications && notifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-4">
          <p className="text-sm font-bold text-amber-800">📢 応援シフト募集中</p>
          <p className="text-xs text-amber-700 mt-1">{notifications[0].message}</p>
          <div className="flex gap-2 mt-2">
            <Link
              href={`/staff/${params.staffId}/calendar`}
              className="bg-brand-gold text-brand-dark text-xs font-bold px-3 py-1.5 rounded-lg"
            >
              カレンダーで応募
            </Link>
          </div>
        </div>
      )}
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
        今月の提出状況
      </p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-brand-dark">{totalRequests}</p>
          <p className="text-xs text-gray-400 mt-1">希望提出日数</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-500">{confirmedCount}</p>
          <p className="text-xs text-gray-400 mt-1">確定シフト数</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-brand-gold">{totalPoints}</p>
          <p className="text-xs text-gray-400 mt-1">ポイント</p>
        </div>
      </div>
    </div>
  )
}

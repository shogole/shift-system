import { createClient } from '@/lib/supabase/server'
import { Staff, Point } from '@/lib/types'
import { approvePoint, rejectPoint } from '@/app/admin/actions'

export default async function PointsPage() {
  const supabase = createClient()
  const [{ data: points }, { data: staffs }] = await Promise.all([
    supabase.from('points').select('*').order('created_at', { ascending: false }),
    supabase.from('staffs').select('id, name'),
  ])

  const staffMap = new Map((staffs ?? []).map(s => [s.id, s]))
  const pending = (points ?? []).filter((p: Point) => !p.approved)
  const approved = (points ?? []).filter((p: Point) => p.approved)

  const totalsByStaff = new Map<string, number>()
  for (const p of approved as Point[]) {
    totalsByStaff.set(p.staff_id, (totalsByStaff.get(p.staff_id) ?? 0) + p.amount)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-brand-dark mb-6">ポイント管理</h2>

      {/* スタッフ別ポイント残高 */}
      <section className="mb-8">
        <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">スタッフ別残高</h3>
        <div className="grid grid-cols-2 gap-3">
          {(staffs ?? []).map((staff) => {
            const total = totalsByStaff.get(staff.id) ?? 0
            return (
              <div key={staff.id} className="bg-white rounded-xl border p-3 flex items-center justify-between">
                <span className="font-bold text-brand-dark text-sm">{staff.name}</span>
                <span className={`text-lg font-bold ${total > 0 ? 'text-brand-gold' : 'text-gray-300'}`}>
                  {total}pt
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* 承認待ち */}
      <section className="mb-8">
        <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">
          承認待ち ({pending.length})
        </h3>
        {pending.length === 0 && (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
            承認待ちのポイントはありません
          </div>
        )}
        <div className="space-y-2">
          {pending.map((point: Point) => {
            const staff = staffMap.get(point.staff_id)
            return (
              <div key={point.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-amber-800">
                    {staff?.name ?? '不明'}
                    <span className="ml-2 text-brand-gold">+{point.amount}pt</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {point.date}
                    {point.reason && <span className="ml-1">— {point.reason}</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={async () => {
                    'use server'
                    await approvePoint(point.id)
                  }}>
                    <button type="submit" className="bg-brand-gold text-brand-dark text-sm font-bold px-3 py-2 rounded-lg">
                      承認
                    </button>
                  </form>
                  <form action={async () => {
                    'use server'
                    await rejectPoint(point.id)
                  }}>
                    <button type="submit" className="border border-gray-300 text-gray-500 text-sm px-3 py-2 rounded-lg">
                      却下
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 承認済み履歴 */}
      {approved.length > 0 && (
        <section>
          <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">
            承認済み履歴（直近{Math.min(approved.length, 20)}件）
          </h3>
          <div className="space-y-1.5">
            {(approved as Point[]).slice(0, 20).map(point => {
              const staff = staffMap.get(point.staff_id)
              return (
                <div key={point.id} className="bg-white border rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-brand-dark">{staff?.name ?? '不明'}</span>
                    <span className="text-xs text-gray-400 ml-2">{point.date}</span>
                    {point.reason && <span className="text-xs text-gray-400 ml-1">— {point.reason}</span>}
                  </div>
                  <span className="text-brand-gold font-bold">+{point.amount}pt</span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

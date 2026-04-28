import { createClient } from '@/lib/supabase/server'
import { ShiftRequest } from '@/lib/types'
import { confirmShift, rejectShift, sendOfferNotification } from '@/app/admin/actions'
import { formatTime } from '@/lib/calculations'

export default async function OffersPage() {
  const supabase = createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const lastDate = new Date(year, month, 0).getDate()
  const monthStart = `${monthStr}-01`
  const monthEnd = `${monthStr}-${String(lastDate).padStart(2, '0')}`

  const [{ data: confirmedShifts }, { data: pendingShifts }, { data: staffs }, { data: budgetRow }] =
    await Promise.all([
      supabase.from('shift_requests').select('date').gte('date', monthStart).lte('date', monthEnd).in('status', ['confirmed', 'added']),
      supabase.from('shift_requests').select('*, staffs(name)').gte('date', monthStart).lte('date', monthEnd).eq('status', 'pending').order('date'),
      supabase.from('staffs').select('id, name'),
      supabase.from('settings').select('value').eq('key', 'budget').single(),
    ])

  const minRequired = (budgetRow?.value as { min_required?: number } | null)?.min_required ?? 2

  const confirmedByDate = new Map<string, number>()
  for (const s of confirmedShifts ?? []) {
    confirmedByDate.set(s.date, (confirmedByDate.get(s.date) ?? 0) + 1)
  }

  const understaffedDates: string[] = []
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`
    if (new Date(dateStr + 'T00:00:00') >= now) {
      if ((confirmedByDate.get(dateStr) ?? 0) < minRequired) {
        understaffedDates.push(dateStr)
      }
    }
  }

  const staffMap = new Map((staffs ?? []).map(s => [s.id, s]))

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-brand-dark mb-6">ヘルプミー管理</h2>

      {/* 人手不足の日 */}
      <section className="mb-8">
        <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">
          人手不足の日 ({understaffedDates.length}日)
        </h3>
        {understaffedDates.length === 0 && (
          <p className="text-sm text-gray-400">人手不足の日はありません</p>
        )}
        {understaffedDates.map(date => {
          const count = confirmedByDate.get(date) ?? 0
          const label = new Date(date + 'T00:00:00').toLocaleDateString('ja-JP', {
            month: 'long', day: 'numeric', weekday: 'short',
          })
          return (
            <div key={date} className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-2 flex items-center justify-between">
              <div>
                <p className="font-bold text-amber-800">{label}</p>
                <p className="text-xs text-amber-600">現在 {count}名 / 最低 {minRequired}名必要</p>
              </div>
              <form action={sendOfferNotification}>
                <input type="hidden" name="date" value={date} />
                <input
                  type="hidden"
                  name="message"
                  value={`${label}のヘルプミーを募集しています（現在${count}名 / ${minRequired}名以上必要）`}
                />
                <button type="submit" className="bg-amber-500 text-white text-sm font-bold px-3 py-2 rounded-lg hover:bg-amber-600">
                  全員に通知
                </button>
              </form>
            </div>
          )
        })}
      </section>

      {/* 未確定の希望シフト */}
      <section>
        <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">
          未確定の希望シフト ({(pendingShifts ?? []).length}件)
        </h3>
        {(pendingShifts ?? []).length === 0 && (
          <p className="text-sm text-gray-400">未確定の希望はありません</p>
        )}
        {(pendingShifts ?? []).map((shift: ShiftRequest & { staffs?: { name: string } }) => {
          const label = new Date(shift.date + 'T00:00:00').toLocaleDateString('ja-JP', {
            month: 'long', day: 'numeric', weekday: 'short',
          })
          const name = (shift as any).staffs?.name ?? staffMap.get(shift.staff_id)?.name ?? '不明'
          return (
            <div key={shift.id} className="bg-white border rounded-xl p-4 mb-2 flex items-center justify-between">
              <div>
                <p className="font-bold text-brand-dark">{name}</p>
                <p className="text-sm text-gray-500">
                  {label}　{formatTime(shift.start_time)}〜{formatTime(shift.end_time)}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={async () => {
                  'use server'
                  await confirmShift(shift.id)
                }}>
                  <button type="submit" className="bg-green-500 text-white text-sm font-bold px-3 py-2 rounded-lg">
                    確定
                  </button>
                </form>
                <form action={async () => {
                  'use server'
                  await rejectShift(shift.id)
                }}>
                  <button type="submit" className="border border-red-300 text-red-500 text-sm px-3 py-2 rounded-lg">
                    却下
                  </button>
                </form>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}

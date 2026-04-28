import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Staff, ShiftRequest } from '@/lib/types'
import { buildDayStats } from '@/lib/dashboard'

const DAY_HEADERS = ['日', '月', '火', '水', '木', '金', '土']

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const now = new Date()
  const monthParam =
    searchParams.month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [yearStr, monthStr] = monthParam.split('-')
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)
  const lastDate = new Date(year, month, 0).getDate()
  const monthStart = `${monthParam}-01`
  const monthEnd = `${monthParam}-${String(lastDate).padStart(2, '0')}`

  const supabase = createClient()
  const [{ data: allShifts }, { data: staffs }, { data: budgetSetting }] = await Promise.all([
    supabase.from('shift_requests').select('*').gte('date', monthStart).lte('date', monthEnd),
    supabase.from('staffs').select('*'),
    supabase.from('settings').select('value').eq('key', 'budget').single(),
  ])

  const staffMap = new Map<string, Staff>((staffs ?? []).map(s => [s.id, s as Staff]))
  const budgetValue = budgetSetting?.value as {
    weekday: number; weekend: number; min_required?: number
  } | null
  const minRequired = budgetValue?.min_required ?? 2

  const shiftsByDate = new Map<string, ShiftRequest[]>()
  for (const shift of (allShifts ?? []) as ShiftRequest[]) {
    const list = shiftsByDate.get(shift.date) ?? []
    list.push(shift)
    shiftsByDate.set(shift.date, list)
  }

  const dayStatsMap = new Map<string, ReturnType<typeof buildDayStats>>()
  let totalLaborCost = 0
  let totalBudget = 0
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${monthParam}-${String(d).padStart(2, '0')}`
    const dow = new Date(year, month - 1, d).getDay()
    const isWeekend = dow === 0 || dow === 6
    const budget = budgetValue ? (isWeekend ? budgetValue.weekend : budgetValue.weekday) : 45000
    const shifts = shiftsByDate.get(dateStr) ?? []
    const stats = buildDayStats(dateStr, shifts, staffMap, budget, minRequired)
    dayStatsMap.set(dateStr, stats)
    totalLaborCost += stats.laborCost
    totalBudget += budget
  }

  const prevMonth =
    month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`
  const nextMonth =
    month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
  const firstDow = new Date(year, month - 1, 1).getDay()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: lastDate }, (_, i) => i + 1),
  ]

  function cellBg(status: string) {
    if (status === 'over') return 'bg-red-50 border-red-200'
    if (status === 'under') return 'bg-amber-50 border-amber-200'
    if (status === 'ok') return 'bg-green-50 border-green-100'
    return 'bg-white border-gray-100'
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-brand-dark">ダッシュボード</h2>
        <div className="flex items-center gap-2">
          <Link href={`/admin?month=${prevMonth}`} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-100">◀</Link>
          <span className="font-bold text-brand-dark min-w-[6rem] text-center">{year}年 {month}月</span>
          <Link href={`/admin?month=${nextMonth}`} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-100">▶</Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 mb-1">月予算合計</p>
          <p className="text-xl font-bold text-brand-dark">¥{totalBudget.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 mb-1">人件費見込み</p>
          <p className={`text-xl font-bold ${totalLaborCost > totalBudget ? 'text-red-500' : 'text-green-600'}`}>
            ¥{totalLaborCost.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 mb-1">予算消化率</p>
          <p className="text-xl font-bold text-brand-dark">
            {totalBudget > 0 ? Math.round((totalLaborCost / totalBudget) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-red-200 bg-red-50 inline-block" /> 予算超過</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-amber-200 bg-amber-50 inline-block" /> 人手不足</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-green-100 bg-green-50 inline-block" /> 確定済み</span>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="grid grid-cols-7">
          {DAY_HEADERS.map((h, i) => (
            <div
              key={h}
              className={`text-center text-xs font-bold py-2 bg-gray-50 border-b ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              {h}
            </div>
          ))}
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="border-b border-r border-gray-50 min-h-[72px]" />
            const dateStr = `${monthParam}-${String(day).padStart(2, '0')}`
            const stats = dayStatsMap.get(dateStr)
            const isToday =
              now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day
            return (
              <Link
                key={dateStr}
                href={`/admin/day/${dateStr}`}
                className={`block p-1.5 min-h-[72px] border-b border-r hover:opacity-75 transition-opacity ${stats ? cellBg(stats.status) : 'bg-white border-gray-100'} ${isToday ? 'ring-2 ring-inset ring-brand-dark' : ''}`}
              >
                <p className={`text-xs font-bold mb-0.5 ${isToday ? 'text-brand-dark' : 'text-gray-600'}`}>{day}</p>
                {stats && stats.confirmedCount > 0 && (
                  <>
                    <p className="text-[10px] text-gray-600">{stats.confirmedCount}名</p>
                    <p className="text-[10px] text-gray-500">¥{stats.laborCost.toLocaleString()}</p>
                  </>
                )}
                {stats && stats.pendingCount > 0 && (
                  <p className="text-[10px] text-amber-600 font-bold">未{stats.pendingCount}</p>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

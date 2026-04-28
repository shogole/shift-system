import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Staff, ShiftRequest } from '@/lib/types'
import { calculateHours } from '@/lib/calculations'

type Period = 'back_half' | 'next_front'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function formatShortTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  return m === 0 ? String(h) : `${h}:${m.toString().padStart(2, '0')}`
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: { period?: string }
}) {
  const supabase = createClient()
  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth() + 1
  const nextMonth = thisMonth === 12 ? 1 : thisMonth + 1
  const nextYear = thisMonth === 12 ? thisYear + 1 : thisYear

  const defaultPeriod: Period = now.getDate() <= 5 ? 'back_half' : 'next_front'
  const period = (searchParams.period as Period) ?? defaultPeriod

  const activeYear = period === 'back_half' ? thisYear : nextYear
  const activeMonth = period === 'back_half' ? thisMonth : nextMonth
  const startDay = period === 'back_half' ? 16 : 1
  const endDay = period === 'back_half' ? new Date(activeYear, activeMonth, 0).getDate() : 15

  const monthStr = `${activeYear}-${String(activeMonth).padStart(2, '0')}`
  const startDate = `${monthStr}-${String(startDay).padStart(2, '0')}`
  const endDate = `${monthStr}-${String(endDay).padStart(2, '0')}`

  const [{ data: staffs }, { data: shifts }] = await Promise.all([
    supabase.from('staffs').select('*').order('name'),
    supabase.from('shift_requests').select('*').gte('date', startDate).lte('date', endDate),
  ])

  const dates: string[] = []
  for (let d = startDay; d <= endDay; d++) {
    dates.push(`${monthStr}-${String(d).padStart(2, '0')}`)
  }

  // staffId -> date -> ShiftRequest
  const shiftMap = new Map<string, Map<string, ShiftRequest>>()
  shifts?.forEach(shift => {
    if (!shiftMap.has(shift.staff_id)) shiftMap.set(shift.staff_id, new Map())
    shiftMap.get(shift.staff_id)!.set(shift.date, shift as ShiftRequest)
  })

  return (
    <div className="p-4">
      {/* タブ */}
      <div className="flex gap-2 mb-4">
        <Link
          href="/admin?period=back_half"
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
            period === 'back_half' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {thisMonth}月後半（16〜末日）
        </Link>
        <Link
          href="/admin?period=next_front"
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
            period === 'next_front' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {nextMonth}月前半（1〜15日）
        </Link>
      </div>

      {/* グリッド */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="border-collapse text-xs whitespace-nowrap">
          <thead>
            {/* 日付ヘッダー */}
            <tr className="bg-gray-50">
              <th className="border-r border-b border-gray-200 px-3 py-2 text-left font-bold text-gray-500 sticky left-0 bg-gray-50 z-10 min-w-[80px]">
                スタッフ
              </th>
              {dates.map(date => {
                const d = new Date(date + 'T00:00:00')
                const day = d.getDate()
                const dow = d.getDay()
                return (
                  <th
                    key={date}
                    className={`border-r border-b border-gray-200 px-2 py-1.5 text-center min-w-[68px] font-normal ${
                      dow === 0 ? 'text-red-500 bg-red-50' : dow === 6 ? 'text-blue-500 bg-blue-50' : 'text-gray-600'
                    }`}
                  >
                    <Link href={`/admin/day/${date}`} className="hover:underline block">
                      <div className="font-bold">{activeMonth}/{day}</div>
                      <div className="text-[10px] opacity-70">{DOW_LABELS[dow]}</div>
                    </Link>
                  </th>
                )
              })}
            </tr>
            {/* 確定人数行 */}
            <tr className="bg-blue-50">
              <td className="border-r border-b border-gray-200 px-3 py-1 font-bold text-blue-600 sticky left-0 bg-blue-50 z-10">
                確定人数
              </td>
              {dates.map(date => {
                const count = shifts?.filter(
                  s => s.date === date && (s.status === 'confirmed' || s.status === 'added')
                ).length ?? 0
                return (
                  <td key={date} className="border-r border-b border-gray-200 px-2 py-1 text-center font-bold text-blue-600">
                    {count > 0 ? count : ''}
                  </td>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {(staffs ?? []).map((staff: Staff) => {
              const staffShifts = shiftMap.get(staff.id)
              return (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="border-r border-b border-gray-200 px-3 py-1.5 font-bold text-brand-dark sticky left-0 bg-white z-10">
                    {staff.name}
                  </td>
                  {dates.map(date => {
                    const shift = staffShifts?.get(date)
                    if (!shift) {
                      return <td key={date} className="border-r border-b border-gray-200" />
                    }

                    const hours = Math.round(calculateHours(shift.start_time, shift.end_time) * 10) / 10
                    const timeStr = `${formatShortTime(shift.start_time)}-${formatShortTime(shift.end_time)}`

                    let cellClass = ''
                    let textClass = 'text-gray-700'
                    if (shift.status === 'pending') { cellClass = 'bg-amber-50'; textClass = 'text-amber-800' }
                    else if (shift.status === 'confirmed') { cellClass = 'bg-green-50'; textClass = 'text-green-800' }
                    else if (shift.status === 'added') { cellClass = 'bg-orange-50'; textClass = 'text-orange-700' }
                    else if (shift.status === 'rejected') { cellClass = 'bg-red-50'; textClass = 'text-red-300 line-through' }

                    return (
                      <td key={date} className={`border-r border-b border-gray-200 px-1.5 py-1 text-center ${cellClass}`}>
                        <div className={`font-bold ${textClass}`}>{timeStr}</div>
                        <div className="text-gray-400">{hours}</div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 凡例 */}
      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-50 border border-amber-200 inline-block" /> 希望提出</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200 inline-block" /> 確定</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-50 border border-orange-200 inline-block" /> 追加</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 border border-red-200 inline-block" /> 却下</span>
      </div>
    </div>
  )
}

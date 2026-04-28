import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Staff, ShiftRequest } from '@/lib/types'
import { calculateHours } from '@/lib/calculations'
import { confirmShift, rejectShift } from '@/app/admin/actions'

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

  // スタッフを出勤時間順にソート（期間中の最小start_timeで並べ替え）
  const sortedStaffs = [...(staffs ?? [] as Staff[])].sort((a, b) => {
    const aShifts = shiftMap.get(a.id)
    const bShifts = shiftMap.get(b.id)
    const aMin = aShifts ? Math.min(...Array.from(aShifts.values()).map(s => parseInt(s.start_time))) : 99
    const bMin = bShifts ? Math.min(...Array.from(bShifts.values()).map(s => parseInt(s.start_time))) : 99
    return aMin - bMin
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
                    className={`border-r border-b border-gray-200 px-2 py-1.5 text-center min-w-[72px] font-normal ${
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
            {sortedStaffs.map((staff: Staff) => {
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

                    if (shift.status === 'pending') {
                      return (
                        <td key={date} className="border-r border-b border-gray-200 bg-amber-50 px-1 py-1 text-center">
                          <div className="font-bold text-amber-800">{timeStr}</div>
                          <div className="text-gray-400 mb-0.5">{hours}</div>
                          <div className="flex gap-0.5 justify-center">
                            <form action={confirmShift.bind(null, shift.id)}>
                              <button type="submit" className="bg-green-500 text-white rounded px-1.5 py-0.5 text-[10px] font-bold hover:bg-green-600">
                                ✓
                              </button>
                            </form>
                            <form action={rejectShift.bind(null, shift.id)}>
                              <button type="submit" className="bg-red-400 text-white rounded px-1.5 py-0.5 text-[10px] font-bold hover:bg-red-500">
                                ×
                              </button>
                            </form>
                          </div>
                        </td>
                      )
                    }

                    if (shift.status === 'confirmed' || shift.status === 'added') {
                      const cellClass = shift.status === 'added' ? 'bg-orange-50' : 'bg-green-50'
                      const textClass = shift.status === 'added' ? 'text-orange-700' : 'text-green-800'
                      return (
                        <td key={date} className={`border-r border-b border-gray-200 ${cellClass} px-1 py-1 text-center`}>
                          <div className={`font-bold ${textClass}`}>{timeStr}</div>
                          <div className="text-gray-400 mb-0.5">{hours}</div>
                          <form action={rejectShift.bind(null, shift.id)}>
                            <button type="submit" className="text-gray-300 hover:text-red-400 text-[10px] transition-colors">
                              取消
                            </button>
                          </form>
                        </td>
                      )
                    }

                    // rejected
                    return (
                      <td key={date} className="border-r border-b border-gray-200 bg-red-50 px-1.5 py-1 text-center">
                        <div className="text-red-300 line-through">{timeStr}</div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-50 border border-amber-200 inline-block" /> 希望提出（✓確定 ×却下）</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200 inline-block" /> 確定</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-50 border border-orange-200 inline-block" /> 追加</span>
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Staff, ShiftRequest } from '@/lib/types'
import ShiftGrid from '@/components/ShiftGrid'

type Period = 'back_half' | 'next_front'

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

  // 社員を上部固定、その後出勤時間順でソート
  const shiftsByStaff = new Map<string, ShiftRequest[]>()
  shifts?.forEach(s => {
    const list = shiftsByStaff.get(s.staff_id) ?? []
    list.push(s as ShiftRequest)
    shiftsByStaff.set(s.staff_id, list)
  })

  const sortedStaffs = [...(staffs ?? [])].sort((a: Staff, b: Staff) => {
    // 社員を最優先
    if (a.employment_type !== b.employment_type) {
      return a.employment_type === 'full_time' ? -1 : 1
    }
    // 出勤時間でソート
    const aShifts = shiftsByStaff.get(a.id) ?? []
    const bShifts = shiftsByStaff.get(b.id) ?? []
    const aMin = aShifts.length > 0 ? Math.min(...aShifts.map(s => parseInt(s.start_time))) : 99
    const bMin = bShifts.length > 0 ? Math.min(...bShifts.map(s => parseInt(s.start_time))) : 99
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

      <ShiftGrid
        staffs={sortedStaffs as Staff[]}
        dates={dates}
        shifts={(shifts ?? []) as ShiftRequest[]}
        activeMonth={activeMonth}
      />

      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 inline-block" /> 朝（6〜8時）</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> 昼（9〜13時）</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100 inline-block" /> 夜（16時〜）</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-50 border border-amber-200 inline-block" /> 希望提出</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200 inline-block" /> 確定</span>
      </div>
    </div>
  )
}

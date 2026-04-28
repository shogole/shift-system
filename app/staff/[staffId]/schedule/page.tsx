import { createClient } from '@/lib/supabase/server'
import MonthCalendar from '@/components/MonthCalendar'
import { formatTime } from '@/lib/calculations'

type DayData = {
  date: string
  startTime?: string
  endTime?: string
  status?: 'selected' | 'confirmed' | 'rejected' | 'added'
}

type ShiftRow = {
  date: string
  start_time: string
  end_time: string
  status: string
}

function buildCalendarDays(requests: ShiftRow[]): Map<string, DayData> {
  return new Map(
    requests.map(r => [
      r.date,
      {
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        status: (r.status === 'pending' ? 'selected' : r.status) as DayData['status'],
      },
    ])
  )
}

export default async function SchedulePage({
  params,
}: {
  params: { staffId: string }
}) {
  const supabase = createClient()
  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth() + 1
  const nextMonth = thisMonth === 12 ? 1 : thisMonth + 1
  const nextYear = thisMonth === 12 ? thisYear + 1 : thisYear

  const thisMonthStr = `${thisYear}-${String(thisMonth).padStart(2, '0')}`
  const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`
  const todayStr = `${thisMonthStr}-${String(now.getDate()).padStart(2, '0')}`

  const [
    { data: thisMonthRequests },
    { data: nextMonthRequests },
    { data: allConfirmedToday },
  ] = await Promise.all([
    supabase
      .from('shift_requests')
      .select('*')
      .eq('staff_id', params.staffId)
      .gte('date', `${thisMonthStr}-01`)
      .lte('date', `${thisMonthStr}-31`),
    supabase
      .from('shift_requests')
      .select('*')
      .eq('staff_id', params.staffId)
      .gte('date', `${nextMonthStr}-01`)
      .lte('date', `${nextMonthStr}-15`),
    supabase
      .from('shift_requests')
      .select('*, staffs(name)')
      .in('status', ['confirmed', 'added'])
      .eq('date', todayStr),
  ])

  const thisMonthDays = buildCalendarDays(thisMonthRequests ?? [])
  const nextMonthDays = buildCalendarDays(nextMonthRequests ?? [])

  const todayShifts = (allConfirmedToday ?? []).map(r => ({
    name: (r.staffs as { name: string }).name,
    startTime: r.start_time as string,
    endTime: r.end_time as string,
  }))

  return (
    <div className="p-4">
      {todayShifts.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            今日のメンバー
          </p>
          {todayShifts.map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <div className="w-8 h-8 rounded-full bg-brand-dark text-brand-gold flex items-center justify-center text-xs font-bold flex-shrink-0">
                {s.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold">{s.name}</p>
                <p className="text-xs text-gray-400">{formatTime(s.startTime)} 〜 {formatTime(s.endTime)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="font-bold mb-2">{thisYear}年 {thisMonth}月</h3>
      <MonthCalendar
        year={thisYear}
        month={thisMonth}
        period="all"
        days={thisMonthDays}
        readonly
      />

      <h3 className="font-bold mt-5 mb-2">{nextYear}年 {nextMonth}月前半（1〜15日）</h3>
      <MonthCalendar
        year={nextYear}
        month={nextMonth}
        period="first"
        days={nextMonthDays}
        readonly
      />

      <div className="flex gap-3 flex-wrap mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-gold inline-block" /> 希望提出済み</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> 確定</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 border border-red-300 inline-block" /> 却下</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-50 border border-orange-400 inline-block" /> 管理者追加</span>
      </div>
    </div>
  )
}

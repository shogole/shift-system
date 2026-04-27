import { createClient } from '@/lib/supabase/server'
import MonthCalendar from '@/components/MonthCalendar'
import { formatTime } from '@/lib/calculations'

export default async function SchedulePage({
  params,
}: {
  params: { staffId: string }
}) {
  const supabase = createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthStr = `${year}-${String(month).padStart(2, '0')}`

  const { data: myRequests } = await supabase
    .from('shift_requests')
    .select('*')
    .eq('staff_id', params.staffId)
    .gte('date', `${monthStr}-01`)
    .lte('date', `${monthStr}-31`)

  const { data: allConfirmed } = await supabase
    .from('shift_requests')
    .select('*, staffs(name)')
    .eq('status', 'confirmed')
    .gte('date', `${monthStr}-01`)
    .lte('date', `${monthStr}-31`)

  const calendarDays = new Map(
    myRequests?.map(r => [
      r.date,
      {
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        status: (r.status === 'pending' ? 'selected' : r.status) as 'selected' | 'confirmed' | 'rejected' | 'added',
      },
    ]) ?? []
  )

  const shiftsByDate = new Map<string, Array<{ name: string; startTime: string; endTime: string }>>()
  allConfirmed?.forEach(r => {
    const existing = shiftsByDate.get(r.date) ?? []
    shiftsByDate.set(r.date, [
      ...existing,
      { name: (r.staffs as { name: string }).name, startTime: r.start_time, endTime: r.end_time },
    ])
  })

  const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayShifts = shiftsByDate.get(todayStr) ?? []

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">{year}年 {month}月</h3>
      </div>
      <MonthCalendar
        year={year}
        month={month}
        period="all"
        days={calendarDays}
        readonly
      />
      <div className="flex gap-3 flex-wrap mt-3 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> 確定</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 border border-red-300 inline-block" /> 希望却下</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-50 border border-orange-400 inline-block" /> 管理者追加</span>
      </div>
      {todayShifts.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3">
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
    </div>
  )
}

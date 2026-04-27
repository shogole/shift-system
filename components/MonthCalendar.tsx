'use client'

import { formatTime } from '@/lib/calculations'

interface DayData {
  date: string
  startTime?: string
  endTime?: string
  status?: 'selected' | 'confirmed' | 'rejected' | 'added'
}

interface MonthCalendarProps {
  year: number
  month: number
  period: 'first' | 'second' | 'all'
  days: Map<string, DayData>
  onDayClick?: (date: string) => void
  readonly?: boolean
}

const DAY_HEADERS = ['日', '月', '火', '水', '木', '金', '土']

export default function MonthCalendar({
  year, month, period, days, onDayClick, readonly = false,
}: MonthCalendarProps) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const lastDate = new Date(year, month, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: lastDate }, (_, i) => i + 1),
  ]

  function isInPeriod(day: number): boolean {
    if (period === 'all') return true
    if (period === 'first') return day <= 15
    return day >= 16
  }

  function getDateStr(day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {DAY_HEADERS.map((h, i) => (
        <div
          key={h}
          className={`text-center text-xs py-1 font-bold ${
            i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
          }`}
        >
          {h}
        </div>
      ))}
      {cells.map((day, idx) => {
        if (!day) return <div key={`empty-${idx}`} />

        const dateStr = getDateStr(day)
        const inPeriod = isInPeriod(day)
        const dayData = days.get(dateStr)
        const status = dayData?.status

        const today = new Date()
        const isToday =
          today.getFullYear() === year &&
          today.getMonth() + 1 === month &&
          today.getDate() === day

        let bgClass = 'bg-white hover:bg-gray-50'
        let textClass = 'text-gray-700'
        let borderClass = isToday ? 'border-2 border-brand-dark' : 'border border-transparent'

        if (status === 'selected') { bgClass = 'bg-brand-gold'; textClass = 'text-brand-dark font-bold' }
        else if (status === 'confirmed') { bgClass = 'bg-green-500'; textClass = 'text-white font-bold' }
        else if (status === 'rejected') { bgClass = 'bg-red-50'; textClass = 'text-red-400 line-through' }
        else if (status === 'added') { bgClass = 'bg-orange-50'; textClass = 'text-orange-500 font-bold'; borderClass = 'border border-orange-400' }

        const dimmed = !inPeriod && !readonly

        return (
          <button
            key={dateStr}
            onClick={() => !dimmed && !readonly && onDayClick?.(dateStr)}
            disabled={dimmed || readonly}
            className={`rounded-lg px-1 py-1.5 min-h-[48px] flex flex-col items-center justify-center text-sm transition-colors ${bgClass} ${textClass} ${borderClass} ${dimmed ? 'opacity-30 cursor-default' : ''} ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span>{day}</span>
            {dayData?.startTime && (
              <span className="text-[9px] opacity-80 leading-tight">
                {formatTime(dayData.startTime)}-{formatTime(dayData.endTime ?? '')}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShiftTemplate, ShiftRequest } from '@/lib/types'
import MonthCalendar from '@/components/MonthCalendar'
import TemplateSelectPopup from '@/components/TemplateSelectPopup'

// days_of_week: 1=月, 2=火, 3=水, 4=木, 5=金, 6=土, 7=日
const DOW_LABELS: Record<number, string> = { 1: '月', 2: '火', 3: '水', 4: '木', 5: '金', 6: '土', 7: '日' }

// JS getDay() 0=日→7, 1-6そのまま
function jsToTemplateDow(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay
}

// back_half = 今月後半（16〜末日）締切: 当月5日
// next_front = 来月前半（1〜15日）締切: 当月20日
type Period = 'back_half' | 'next_front'

export default function CalendarPage({
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

  // デフォルト: 5日以前は今月後半、6日以降は来月前半
  const defaultPeriod: Period = now.getDate() <= 5 ? 'back_half' : 'next_front'
  const [period, setPeriod] = useState<Period>(defaultPeriod)
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [requests, setRequests] = useState<Map<string, ShiftRequest>>(new Map())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // アクティブな年月・カレンダー表示期間
  const activeYear = period === 'back_half' ? thisYear : nextYear
  const activeMonth = period === 'back_half' ? thisMonth : nextMonth
  const calPeriod = period === 'back_half' ? ('second' as const) : ('first' as const)

  // 締切は両方とも当月
  const deadlineDay = period === 'back_half' ? 5 : 20
  const daysUntilDeadline = deadlineDay - now.getDate()

  useEffect(() => {
    supabase
      .from('shift_templates')
      .select('*')
      .eq('staff_id', params.staffId)
      .then(({ data }) => setTemplates(data ?? []))
  }, [params.staffId])

  useEffect(() => {
    const monthStr = `${activeYear}-${String(activeMonth).padStart(2, '0')}`
    supabase
      .from('shift_requests')
      .select('*')
      .eq('staff_id', params.staffId)
      .gte('date', `${monthStr}-01`)
      .lte('date', `${monthStr}-31`)
      .then(({ data }) => {
        const map = new Map<string, ShiftRequest>()
        data?.forEach(r => map.set(r.date, r))
        setRequests(map)
      })
  }, [params.staffId, period, activeYear, activeMonth])

  const calendarDays = new Map(
    Array.from(requests.entries()).map(([date, req]) => [
      date,
      {
        date,
        startTime: req.start_time,
        endTime: req.end_time,
        status: (req.status === 'pending' ? 'selected' : req.status) as 'selected' | 'confirmed' | 'rejected' | 'added',
      },
    ])
  )

  function handleDayClick(date: string) {
    const existing = requests.get(date)
    if (existing && existing.status !== 'pending') return
    if (existing && existing.status === 'pending') {
      handleRemoveShift(date, existing.id)
      return
    }
    setSelectedDate(date)
  }

  async function handleRemoveShift(date: string, shiftId: string) {
    setSaving(true)
    await supabase.from('shift_requests').delete().eq('id', shiftId)
    setRequests(prev => {
      const next = new Map(prev)
      next.delete(date)
      return next
    })
    setSaving(false)
  }

  async function handleTemplateSelect(template: ShiftTemplate) {
    if (!selectedDate) return
    setSelectedDate(null)
    setSaving(true)
    const { data } = await supabase
      .from('shift_requests')
      .insert({
        staff_id: params.staffId,
        date: selectedDate,
        start_time: template.start_time,
        end_time: template.end_time,
        status: 'pending',
      })
      .select()
      .single()
    if (data) {
      setRequests(prev => new Map(prev).set(selectedDate, data))
    }
    setSaving(false)
  }

  async function handleBulkFill(template: ShiftTemplate) {
    if (!template.days_of_week || template.days_of_week.length === 0) return
    setSaving(true)
    const startDay = calPeriod === 'second' ? 16 : 1
    const endDay = calPeriod === 'second' ? new Date(activeYear, activeMonth, 0).getDate() : 15

    const toInsert: { date: string; start_time: string; end_time: string }[] = []
    for (let d = startDay; d <= endDay; d++) {
      const dateStr = `${activeYear}-${String(activeMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (requests.has(dateStr)) continue
      const dow = jsToTemplateDow(new Date(activeYear, activeMonth - 1, d).getDay())
      if (template.days_of_week.includes(dow)) {
        toInsert.push({ date: dateStr, start_time: template.start_time, end_time: template.end_time })
      }
    }

    if (toInsert.length > 0) {
      const { data } = await supabase
        .from('shift_requests')
        .insert(toInsert.map(r => ({ staff_id: params.staffId, ...r, status: 'pending' })))
        .select()
      if (data) {
        setRequests(prev => {
          const next = new Map(prev)
          data.forEach(r => next.set(r.date, r))
          return next
        })
      }
    }
    setSaving(false)
  }

  async function handleSubmit() {
    setSaving(true)
    setSubmitted(true)
    setSaving(false)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const pendingCount = Array.from(requests.values()).filter(r => r.status === 'pending').length

  const tabLabel = (p: Period) =>
    p === 'back_half'
      ? `今月後半（${thisMonth}月16〜末日）`
      : `来月前半（${nextMonth}月1〜15日）`

  return (
    <div className="p-4">
      {daysUntilDeadline >= 0 && daysUntilDeadline <= 10 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 mb-3 text-sm text-amber-800">
          ⏰ {period === 'back_half' ? '今月後半' : '来月前半'}締切まであと <strong>{daysUntilDeadline}日</strong>
          （{thisMonth}月{deadlineDay}日）
        </div>
      )}
      {daysUntilDeadline < 0 && (
        <div className="bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 mb-3 text-sm text-gray-500">
          この期間の締切（{thisMonth}月{deadlineDay}日）は過ぎています
        </div>
      )}
      <div className="flex bg-gray-100 rounded-lg p-0.5 mb-3">
        {(['back_half', 'next_front'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${
              period === p ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400'
            }`}
          >
            {tabLabel(p)}
          </button>
        ))}
      </div>
      {templates.filter(t => t.days_of_week && t.days_of_week.length > 0).length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-1.5">曜日一括入力</p>
          <div className="flex flex-wrap gap-2">
            {templates
              .filter(t => t.days_of_week && t.days_of_week.length > 0)
              .map(t => (
                <button
                  key={t.id ?? t.slot}
                  onClick={() => handleBulkFill(t)}
                  disabled={saving}
                  className="bg-brand-gold text-brand-dark text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {t.label ?? `テンプレ${t.slot}`}（{t.days_of_week!.sort((a, b) => a - b).map(d => DOW_LABELS[d]).join('・')}）
                </button>
              ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">{activeYear}年 {activeMonth}月</h3>
      </div>
      <MonthCalendar
        year={activeYear}
        month={activeMonth}
        period={calPeriod}
        days={calendarDays}
        onDayClick={handleDayClick}
      />
      <div className="flex gap-3 flex-wrap mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-gold inline-block" /> 希望提出済み</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> 確定</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 border border-red-300 inline-block" /> 却下</span>
      </div>
      <button
        onClick={handleSubmit}
        disabled={saving || pendingCount === 0}
        className="w-full mt-4 bg-brand-dark text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {submitted ? '✓ 送信しました' : `希望を送信する（${pendingCount}日）`}
      </button>
      {selectedDate && (
        <TemplateSelectPopup
          templates={templates}
          onSelect={handleTemplateSelect}
          onCancel={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}

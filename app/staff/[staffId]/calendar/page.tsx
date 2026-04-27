'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShiftTemplate, ShiftRequest } from '@/lib/types'
import MonthCalendar from '@/components/MonthCalendar'
import TemplateSelectPopup from '@/components/TemplateSelectPopup'

type Period = 'first' | 'second'

export default function CalendarPage({
  params,
}: {
  params: { staffId: string }
}) {
  const supabase = createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [period, setPeriod] = useState<Period>('first')
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [requests, setRequests] = useState<Map<string, ShiftRequest>>(new Map())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const deadlineDay = period === 'first' ? 5 : 20
  const daysUntilDeadline = deadlineDay - now.getDate()

  useEffect(() => {
    supabase
      .from('shift_templates')
      .select('*')
      .eq('staff_id', params.staffId)
      .then(({ data }) => setTemplates(data ?? []))

    const monthStr = `${year}-${String(month).padStart(2, '0')}`
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
  }, [params.staffId])

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

  async function handleSubmit() {
    setSaving(true)
    setSubmitted(true)
    setSaving(false)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const pendingCount = Array.from(requests.values()).filter(r => r.status === 'pending').length

  return (
    <div className="p-4">
      {daysUntilDeadline >= 0 && daysUntilDeadline <= 10 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 mb-3 text-sm text-amber-800">
          ⏰ {period === 'first' ? '前半' : '後半'}締切まであと <strong>{daysUntilDeadline}日</strong>
          （{month}月{deadlineDay}日）
        </div>
      )}
      <div className="flex bg-gray-100 rounded-lg p-0.5 mb-3">
        {(['first', 'second'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-colors ${
              period === p ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400'
            }`}
          >
            {p === 'first' ? '前半（1〜15日）' : '後半（16〜末日）'}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">{year}年 {month}月</h3>
      </div>
      <MonthCalendar
        year={year}
        month={month}
        period={period}
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

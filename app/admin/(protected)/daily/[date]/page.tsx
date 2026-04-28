'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Staff, ShiftRequest } from '@/lib/types'
import {
  calculateDailyLaborCost,
  calculateLaborRate,
  calculateShiftCost,
  formatTime,
} from '@/lib/calculations'
import Link from 'next/link'

interface OvertimeEntry {
  staff_id: string
  minutes: number
  reason: string
}

export default function DailyReportPage({ params }: { params: { date: string } }) {
  const { date } = params
  const supabase = createClient()

  const [staffs, setStaffs] = useState<Staff[]>([])
  const [confirmedShifts, setConfirmedShifts] = useState<ShiftRequest[]>([])
  const [revenue, setRevenue] = useState('')
  const [overtimeLogs, setOvertimeLogs] = useState<OvertimeEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('staffs').select('*'),
      supabase.from('shift_requests').select('*').eq('date', date).in('status', ['confirmed', 'added']),
      supabase.from('daily_reports').select('*').eq('date', date).single(),
    ]).then(([{ data: s }, { data: shifts }, { data: r }]) => {
      setStaffs(s ?? [])
      setConfirmedShifts(shifts ?? [])
      if (r) {
        setRevenue(r.revenue?.toString() ?? '')
        setOvertimeLogs(r.overtime_logs ?? [])
      }
    })
  }, [date])

  const staffMap = new Map<string, Staff>(staffs.map(s => [s.id, s]))
  const totalLaborCost = calculateDailyLaborCost(confirmedShifts, staffMap)
  const revenueNum = parseInt(revenue) || 0
  const laborRate = calculateLaborRate(totalLaborCost, revenueNum)

  const overtimeCost = overtimeLogs.reduce((sum, log) => {
    const staff = staffMap.get(log.staff_id)
    if (!staff || staff.employment_type !== 'part_time' || !staff.hourly_rate) return sum
    return sum + Math.round((staff.hourly_rate / 60) * log.minutes * 1.25)
  }, 0)

  async function handleSave() {
    setSaving(true)
    await supabase.from('daily_reports').upsert(
      {
        date,
        revenue: revenueNum || null,
        total_labor_cost: totalLaborCost,
        labor_rate: revenueNum > 0 ? laborRate : null,
        overtime_logs: overtimeLogs,
      },
      { onConflict: 'date' }
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addOvertime() {
    setOvertimeLogs(prev => [...prev, { staff_id: '', minutes: 30, reason: '' }])
  }

  function updateOvertime(idx: number, field: keyof OvertimeEntry, value: string | number) {
    setOvertimeLogs(prev => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)))
  }

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/day/${date}`} className="text-gray-400 hover:text-gray-600 text-sm">← 戻る</Link>
        <h2 className="text-xl font-bold text-brand-dark">{dateLabel} 日報</h2>
      </div>

      {/* 売上入力 */}
      <section className="bg-white rounded-xl border p-4 mb-4">
        <label className="text-xs text-gray-500 font-bold uppercase tracking-wide block mb-2">売上</label>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-lg">¥</span>
          <input
            type="number"
            value={revenue}
            onChange={e => setRevenue(e.target.value)}
            className="border rounded-lg px-3 py-2 text-lg font-bold w-full"
            placeholder="0"
          />
        </div>
      </section>

      {/* 人件費内訳 */}
      <section className="bg-white rounded-xl border p-4 mb-4">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-3">人件費内訳</p>
        <div className="space-y-2 mb-3">
          {confirmedShifts.map(shift => {
            const staff = staffMap.get(shift.staff_id)
            if (!staff) return null
            const cost = calculateShiftCost(staff, shift.start_time, shift.end_time)
            return (
              <div key={shift.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {staff.name}
                  <span className="text-xs text-gray-400 ml-1">
                    {formatTime(shift.start_time)}〜{formatTime(shift.end_time)}
                  </span>
                </span>
                <span className="font-bold">¥{cost.toLocaleString()}</span>
              </div>
            )
          })}
        </div>
        <div className="border-t pt-2 flex justify-between font-bold">
          <span>人件費合計</span>
          <span>¥{totalLaborCost.toLocaleString()}</span>
        </div>
        {overtimeCost > 0 && (
          <div className="flex justify-between text-sm text-amber-600 mt-1">
            <span>残業割増分（+25%）</span>
            <span>¥{overtimeCost.toLocaleString()}</span>
          </div>
        )}
      </section>

      {/* 人件費率 */}
      <section className="bg-white rounded-xl border p-4 mb-4">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">人件費率</p>
        <div className="flex items-end gap-2">
          <p className={`text-3xl font-bold ${
            revenueNum === 0 ? 'text-gray-300'
            : laborRate > 30 ? 'text-red-500'
            : laborRate > 25 ? 'text-amber-500'
            : 'text-green-600'
          }`}>
            {revenueNum > 0 ? `${laborRate}%` : '—'}
          </p>
          {revenueNum > 0 && <p className="text-sm text-gray-400 mb-1">（目標: 25%以下）</p>}
        </div>
        {revenueNum > 0 && (
          <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full ${laborRate > 30 ? 'bg-red-400' : laborRate > 25 ? 'bg-amber-400' : 'bg-green-400'}`}
              style={{ width: `${Math.min(laborRate, 100)}%` }}
            />
          </div>
        )}
      </section>

      {/* 残業記録 */}
      <section className="bg-white rounded-xl border p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">残業記録</p>
          <button onClick={addOvertime} className="text-xs text-brand-dark font-bold hover:underline">
            + 追加
          </button>
        </div>
        {overtimeLogs.length === 0 && <p className="text-sm text-gray-400">残業なし</p>}
        {overtimeLogs.map((log, idx) => (
          <div key={idx} className="flex gap-2 mb-2 items-center">
            <select
              value={log.staff_id}
              onChange={e => updateOvertime(idx, 'staff_id', e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm flex-1"
            >
              <option value="">スタッフ選択</option>
              {staffs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input
              type="number"
              value={log.minutes}
              onChange={e => updateOvertime(idx, 'minutes', parseInt(e.target.value))}
              className="border rounded-lg px-2 py-1.5 text-sm w-16"
              min={1}
            />
            <span className="text-xs text-gray-400">分</span>
            <input
              type="text"
              value={log.reason}
              onChange={e => updateOvertime(idx, 'reason', e.target.value)}
              placeholder="理由"
              className="border rounded-lg px-2 py-1.5 text-sm flex-1"
            />
            <button
              onClick={() => setOvertimeLogs(prev => prev.filter((_, i) => i !== idx))}
              className="text-red-400 hover:text-red-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-brand-dark text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {saved ? '✓ 保存しました' : saving ? '保存中...' : '日報を保存'}
      </button>
    </div>
  )
}

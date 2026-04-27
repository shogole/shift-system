'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShiftTemplate } from '@/lib/types'
import { formatTime } from '@/lib/calculations'

const DAYS = ['', '月', '火', '水', '木', '金', '土', '日']
const SLOTS = [1, 2, 3] as const

export default function TemplatesPage({
  params,
}: {
  params: { staffId: string }
}) {
  const supabase = createClient()
  const [templates, setTemplates] = useState<Partial<ShiftTemplate>[]>([
    { slot: 1 }, { slot: 2 }, { slot: 3 },
  ])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase
      .from('shift_templates')
      .select('*')
      .eq('staff_id', params.staffId)
      .then(({ data }) => {
        if (!data) return
        setTemplates(prev =>
          prev.map(t => data.find(d => d.slot === t.slot) ?? t)
        )
      })
  }, [params.staffId])

  function updateTemplate(slot: number, field: string, value: string | number[]) {
    setTemplates(prev =>
      prev.map(t => t.slot === slot ? { ...t, [field]: value } : t)
    )
  }

  function toggleDay(slot: number, day: number) {
    const tmpl = templates.find(t => t.slot === slot)
    const current = tmpl?.days_of_week ?? []
    const next = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day]
    updateTemplate(slot, 'days_of_week', next)
  }

  async function handleSave() {
    setSaving(true)
    for (const tmpl of templates) {
      if (!tmpl.start_time || !tmpl.end_time) continue
      await supabase.from('shift_templates').upsert({
        staff_id: params.staffId,
        slot: tmpl.slot,
        label: tmpl.label ?? null,
        start_time: tmpl.start_time,
        end_time: tmpl.end_time,
        days_of_week: tmpl.days_of_week ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'staff_id,slot' })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
        テンプレ管理（最大3つ）
      </p>
      <p className="text-xs text-gray-400 mb-4">
        一度設定したテンプレは翌月以降もそのまま使えます
      </p>
      <div className="space-y-3 mb-4">
        {SLOTS.map((slot) => {
          const tmpl = templates.find(t => t.slot === slot) ?? { slot }
          return (
            <div key={slot} className="border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-brand-gold text-brand-dark text-xs font-bold px-2 py-0.5 rounded-full">
                  テンプレ {slot}
                </span>
                <input
                  type="text"
                  placeholder="名前（例：ランチ）"
                  value={tmpl.label ?? ''}
                  onChange={e => updateTemplate(slot, 'label', e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1"
                />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="time"
                  value={tmpl.start_time ? formatTime(tmpl.start_time) : ''}
                  onChange={e => updateTemplate(slot, 'start_time', e.target.value + ':00')}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                />
                <span className="text-gray-400">〜</span>
                <input
                  type="time"
                  value={tmpl.end_time ? formatTime(tmpl.end_time) : ''}
                  onChange={e => updateTemplate(slot, 'end_time', e.target.value + ':00')}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">曜日固定（任意）</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map(day => {
                    const selected = tmpl.days_of_week?.includes(day)
                    return (
                      <button
                        key={day}
                        onClick={() => toggleDay(slot, day)}
                        className={`flex-1 py-1 rounded text-xs font-bold transition-colors ${
                          selected
                            ? 'bg-brand-dark text-white'
                            : 'bg-gray-100 text-gray-500'
                        } ${day === 7 ? 'text-red-400' : day === 6 ? 'text-blue-400' : ''}`}
                      >
                        {DAYS[day]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-brand-dark text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {saved ? '✓ 保存しました' : saving ? '保存中...' : '保存する'}
      </button>
    </div>
  )
}

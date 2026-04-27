'use client'

import { ShiftTemplate } from '@/lib/types'
import { formatTime } from '@/lib/calculations'

interface TemplateSelectPopupProps {
  templates: ShiftTemplate[]
  onSelect: (template: ShiftTemplate) => void
  onCancel: () => void
}

export default function TemplateSelectPopup({
  templates, onSelect, onCancel,
}: TemplateSelectPopupProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-t-2xl p-5 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-base mb-4">テンプレを選択</h3>
        <div className="space-y-2 mb-3">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              テンプレが登録されていません。先に「テンプレ」タブで設定してください。
            </p>
          ) : (
            templates.map(t => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="w-full border-2 border-gray-200 rounded-xl p-3 text-left hover:border-brand-gold transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-brand-gold text-brand-dark text-xs font-bold px-2 py-0.5 rounded-full">
                    {t.slot}
                  </span>
                  {t.label && <span className="text-sm text-gray-500">{t.label}</span>}
                </div>
                <p className="text-xl font-bold mt-1">
                  {formatTime(t.start_time)} 〜 {formatTime(t.end_time)}
                </p>
              </button>
            ))
          )}
        </div>
        <button
          onClick={onCancel}
          className="w-full border border-gray-200 rounded-xl py-2.5 text-sm"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}

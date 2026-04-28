import { createClient } from '@/lib/supabase/server'
import { OfferSlot } from '@/lib/types'
import { sendOfferNotification, deleteOfferSlot } from '@/app/admin/actions'
import { formatTime } from '@/lib/calculations'

export default async function OffersPage() {
  const supabase = createClient()
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const { data: offerSlots } = await supabase
    .from('offer_slots')
    .select('*')
    .gte('date', todayStr)
    .order('date')

  const slots = (offerSlots ?? []) as OfferSlot[]

  const bulkMessage = slots.map(s => {
    const label = new Date(s.date + 'T00:00:00').toLocaleDateString('ja-JP', {
      month: 'long', day: 'numeric', weekday: 'short',
    })
    return `${label} ${formatTime(s.start_time)}〜${formatTime(s.end_time)}`
  }).join('、')

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-brand-dark mb-6">🆘 ヘルプミー管理</h2>

      <section>
        <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">
          登録済みヘルプミー枠 ({slots.length}件)
        </h3>

        {slots.length === 0 ? (
          <p className="text-sm text-gray-400">ダッシュボードのグリッド下部から日付ごとに登録できます</p>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {slots.map(slot => {
                const label = new Date(slot.date + 'T00:00:00').toLocaleDateString('ja-JP', {
                  month: 'long', day: 'numeric', weekday: 'short',
                })
                return (
                  <div key={slot.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-red-800">{label}</p>
                      <p className="text-sm text-red-600">{formatTime(slot.start_time)}〜{formatTime(slot.end_time)}</p>
                    </div>
                    <form action={deleteOfferSlot.bind(null, slot.id)}>
                      <button type="submit" className="text-xs text-red-300 hover:text-red-500">
                        削除
                      </button>
                    </form>
                  </div>
                )
              })}
            </div>

            <form action={sendOfferNotification}>
              <input type="hidden" name="message" value={`ヘルプミー募集中！${bulkMessage}`} />
              <button
                type="submit"
                className="w-full bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors"
              >
                📢 全スタッフに一斉送信（{slots.length}件）
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { Staff, ShiftRequest } from '@/lib/types'
import { confirmShift, rejectShift, addShiftByAdmin } from '@/app/admin/actions'
import { calculateShiftCost, formatTime } from '@/lib/calculations'
import Link from 'next/link'

export default async function DayDetailPage({
  params,
}: {
  params: { date: string }
}) {
  const { date } = params
  const supabase = createClient()

  const [{ data: shifts }, { data: staffs }] = await Promise.all([
    supabase.from('shift_requests').select('*').eq('date', date).order('start_time'),
    supabase.from('staffs').select('*').order('name'),
  ])

  const staffMap = new Map<string, Staff>((staffs ?? []).map(s => [s.id, s as Staff]))
  const typedShifts = (shifts ?? []) as ShiftRequest[]

  const confirmed = typedShifts.filter(s => s.status === 'confirmed' || s.status === 'added')
  const pending = typedShifts.filter(s => s.status === 'pending')
  const rejected = typedShifts.filter(s => s.status === 'rejected')

  const totalLaborCost = confirmed.reduce((sum, s) => {
    const staff = staffMap.get(s.staff_id)
    return sum + (staff ? calculateShiftCost(staff, s.start_time, s.end_time) : 0)
  }, 0)

  const shiftStaffIds = new Set(typedShifts.map(s => s.staff_id))
  const staffWithoutShift = (staffs ?? []).filter(s => !shiftStaffIds.has(s.id))

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← 戻る</Link>
        <h2 className="text-xl font-bold text-brand-dark">{dateLabel}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 mb-1">確定スタッフ</p>
          <p className="text-2xl font-bold text-green-600">{confirmed.length}名</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 mb-1">人件費合計</p>
          <p className="text-2xl font-bold text-brand-dark">¥{totalLaborCost.toLocaleString()}</p>
        </div>
      </div>

      {/* 未確定の希望 */}
      {pending.length > 0 && (
        <section className="mb-6">
          <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">
            未確定の希望 ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((shift) => {
              const staff = staffMap.get(shift.staff_id)
              const cost = staff ? calculateShiftCost(staff, shift.start_time, shift.end_time) : 0
              return (
                <div key={shift.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-brand-dark">{staff?.name ?? '不明'}</p>
                    <p className="text-sm text-gray-500">
                      {formatTime(shift.start_time)}〜{formatTime(shift.end_time)}
                      <span className="ml-2 text-gray-400">¥{cost.toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={async () => {
                      'use server'
                      await confirmShift(shift.id)
                    }}>
                      <button type="submit" className="bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-green-600">
                        確定
                      </button>
                    </form>
                    <form action={async () => {
                      'use server'
                      await rejectShift(shift.id)
                    }}>
                      <button type="submit" className="border border-red-300 text-red-500 text-sm font-bold px-4 py-2 rounded-lg hover:bg-red-50">
                        却下
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 確定済みシフト */}
      {confirmed.length > 0 && (
        <section className="mb-6">
          <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">
            確定シフト ({confirmed.length})
          </h3>
          <div className="space-y-2">
            {confirmed.map((shift) => {
              const staff = staffMap.get(shift.staff_id)
              const cost = staff ? calculateShiftCost(staff, shift.start_time, shift.end_time) : 0
              return (
                <div key={shift.id} className="bg-green-50 rounded-xl border border-green-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-brand-dark">
                      {staff?.name ?? '不明'}
                      {shift.status === 'added' && (
                        <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">管理者追加</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatTime(shift.start_time)}〜{formatTime(shift.end_time)}
                      <span className="ml-2 text-gray-400">¥{cost.toLocaleString()}</span>
                    </p>
                  </div>
                  <form action={async () => {
                    'use server'
                    await rejectShift(shift.id)
                  }}>
                    <button type="submit" className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                      取消
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 却下済み */}
      {rejected.length > 0 && (
        <section className="mb-6">
          <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">
            却下済み ({rejected.length})
          </h3>
          <div className="space-y-2">
            {rejected.map((shift) => {
              const staff = staffMap.get(shift.staff_id)
              return (
                <div key={shift.id} className="bg-red-50 rounded-xl border border-red-200 p-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-400 line-through">{staff?.name ?? '不明'}</p>
                    <p className="text-xs text-gray-400">{formatTime(shift.start_time)}〜{formatTime(shift.end_time)}</p>
                  </div>
                  <form action={async () => {
                    'use server'
                    await confirmShift(shift.id)
                  }}>
                    <button type="submit" className="text-xs text-green-500 hover:underline">
                      復活
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 管理者シフト追加 */}
      {staffWithoutShift.length > 0 && (
        <section className="mb-6">
          <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">シフトを追加</h3>
          <form action={addShiftByAdmin} className="bg-white rounded-xl border p-4">
            <input type="hidden" name="date" value={date} />
            <div className="flex gap-3 flex-wrap">
              <select name="staff_id" className="border rounded-lg px-3 py-2 text-sm flex-1" required>
                <option value="">スタッフを選択</option>
                {staffWithoutShift.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input type="time" name="start_time" defaultValue="10:00" className="border rounded-lg px-3 py-2 text-sm" required />
              <input type="time" name="end_time" defaultValue="17:00" className="border rounded-lg px-3 py-2 text-sm" required />
              <button type="submit" className="bg-brand-dark text-white text-sm font-bold px-4 py-2 rounded-lg">
                追加
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="pt-4 border-t">
        <Link href={`/admin/daily/${date}`} className="text-sm text-brand-dark font-bold hover:underline">
          日報を入力 →
        </Link>
      </div>
    </div>
  )
}

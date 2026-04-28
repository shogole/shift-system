import { createClient } from '@/lib/supabase/server'
import { Staff } from '@/lib/types'
import {
  createStaff,
  updateStaff,
  deleteStaff,
  updateBudgetSettings,
  updateDeadlineSettings,
} from '@/app/admin/actions'

export default async function SettingsPage() {
  const supabase = createClient()
  const [{ data: staffs }, { data: budgetRow }, { data: deadlineRow }] = await Promise.all([
    supabase.from('staffs').select('*').order('created_at'),
    supabase.from('settings').select('value').eq('key', 'budget').single(),
    supabase.from('settings').select('value').eq('key', 'deadline').single(),
  ])

  const budget = budgetRow?.value as { weekday: number; weekend: number; min_required?: number } | null
  const deadline = deadlineRow?.value as { first_half: number; second_half: number } | null

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-brand-dark mb-6">設定</h2>

      {/* 予算設定 */}
      <section className="mb-8">
        <h3 className="font-bold text-gray-600 mb-3">予算設定</h3>
        <form action={updateBudgetSettings} className="bg-white rounded-xl border p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">平日予算（円）</label>
              <input type="number" name="weekday" defaultValue={budget?.weekday ?? 45000}
                className="w-full border rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">土日祝予算（円）</label>
              <input type="number" name="weekend" defaultValue={budget?.weekend ?? 55000}
                className="w-full border rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">最低必要人数</label>
              <input type="number" name="min_required" defaultValue={budget?.min_required ?? 2}
                className="w-full border rounded-lg px-3 py-2 text-sm" required min={1} />
            </div>
          </div>
          <button type="submit" className="mt-3 bg-brand-dark text-white text-sm font-bold px-4 py-2 rounded-lg">
            保存
          </button>
        </form>
      </section>

      {/* 締切設定 */}
      <section className="mb-8">
        <h3 className="font-bold text-gray-600 mb-3">シフト締切日</h3>
        <form action={updateDeadlineSettings} className="bg-white rounded-xl border p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">前半締切（毎月〇日）</label>
              <input type="number" name="first_half" defaultValue={deadline?.first_half ?? 5}
                className="w-full border rounded-lg px-3 py-2 text-sm" required min={1} max={15} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">後半締切（毎月〇日）</label>
              <input type="number" name="second_half" defaultValue={deadline?.second_half ?? 20}
                className="w-full border rounded-lg px-3 py-2 text-sm" required min={16} max={28} />
            </div>
          </div>
          <button type="submit" className="mt-3 bg-brand-dark text-white text-sm font-bold px-4 py-2 rounded-lg">
            保存
          </button>
        </form>
      </section>

      {/* スタッフ一覧 */}
      <section className="mb-6">
        <h3 className="font-bold text-gray-600 mb-3">スタッフ一覧</h3>
        <div className="space-y-2 mb-4">
          {(staffs ?? []).map((staff: Staff) => (
            <details key={staff.id} className="bg-white rounded-xl border group">
              <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                <div>
                  <span className="font-bold text-brand-dark">{staff.name}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {staff.employment_type === 'part_time'
                      ? `時給 ¥${staff.hourly_rate?.toLocaleString()}`
                      : `月給 ¥${staff.monthly_salary?.toLocaleString()} (${staff.working_days_per_month}日/月)`}
                  </span>
                </div>
                <span className="text-gray-400 text-sm">▾</span>
              </summary>
              <div className="px-4 pb-4 border-t pt-3">
                <form action={updateStaff}>
                  <input type="hidden" name="id" value={staff.id} />
                  <StaffFormFields defaultValues={staff} />
                  <div className="flex gap-2 mt-3">
                    <button type="submit" className="bg-brand-dark text-white text-sm font-bold px-4 py-2 rounded-lg">
                      更新
                    </button>
                    <form action={deleteStaff.bind(null, staff.id)}>
                      <button
                        type="submit"
                        className="border border-red-300 text-red-500 text-sm font-bold px-4 py-2 rounded-lg hover:bg-red-50"
                      >
                        削除
                      </button>
                    </form>
                  </div>
                </form>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* スタッフ追加 */}
      <section>
        <h3 className="font-bold text-gray-600 mb-3">スタッフを追加</h3>
        <form action={createStaff} className="bg-white rounded-xl border p-4">
          <StaffFormFields />
          <button type="submit" className="mt-3 bg-brand-dark text-white text-sm font-bold px-4 py-2 rounded-lg">
            追加
          </button>
        </form>
      </section>
    </div>
  )
}

function StaffFormFields({ defaultValues }: { defaultValues?: Staff }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="text-xs text-gray-500 block mb-1">名前</label>
        <input type="text" name="name" defaultValue={defaultValues?.name}
          className="w-full border rounded-lg px-3 py-2 text-sm" required />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">雇用種別</label>
        <select name="employment_type" defaultValue={defaultValues?.employment_type ?? 'part_time'}
          className="w-full border rounded-lg px-3 py-2 text-sm">
          <option value="part_time">アルバイト</option>
          <option value="full_time">社員</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">稼働日数/月（社員）</label>
        <input type="number" name="working_days_per_month"
          defaultValue={defaultValues?.working_days_per_month ?? 22}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">時給（アルバイト）</label>
        <input type="number" name="hourly_rate" defaultValue={defaultValues?.hourly_rate ?? ''}
          className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="例: 1100" />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">月給（社員）</label>
        <input type="number" name="monthly_salary" defaultValue={defaultValues?.monthly_salary ?? ''}
          className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="例: 250000" />
      </div>
    </div>
  )
}

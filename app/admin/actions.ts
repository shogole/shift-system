'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ===== 認証 =====

export async function loginAdmin(formData: FormData) {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) throw new Error('ADMIN_PASSWORD is not set')
  const password = formData.get('password') as string
  if (password === adminPassword) {
    cookies().set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
    })
    redirect('/admin')
  } else {
    redirect('/admin/login?error=1')
  }
}

export async function logoutAdmin() {
  cookies().delete('admin_session')
  redirect('/admin/login')
}

// ===== シフト確定/却下 =====

export async function confirmShift(shiftId: string) {
  const supabase = createClient()
  await supabase
    .from('shift_requests')
    .update({ status: 'confirmed' })
    .eq('id', shiftId)
  revalidatePath('/admin', 'layout')
}

export async function rejectShift(shiftId: string) {
  const supabase = createClient()
  await supabase
    .from('shift_requests')
    .update({ status: 'rejected' })
    .eq('id', shiftId)
  revalidatePath('/admin', 'layout')
}

// ===== スタッフ管理 =====

export async function createStaff(formData: FormData) {
  const supabase = createClient()
  const employmentType = formData.get('employment_type') as string
  await supabase.from('staffs').insert({
    name: formData.get('name') as string,
    employment_type: employmentType,
    hourly_rate: employmentType === 'part_time' ? Number(formData.get('hourly_rate')) || null : null,
    monthly_salary: employmentType === 'full_time' ? Number(formData.get('monthly_salary')) || null : null,
    working_days_per_month: Number(formData.get('working_days_per_month')) || 22,
  })
  redirect('/admin/settings')
}

export async function updateStaff(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string
  const employmentType = formData.get('employment_type') as string
  await supabase
    .from('staffs')
    .update({
      name: formData.get('name') as string,
      employment_type: employmentType,
      hourly_rate: employmentType === 'part_time' ? Number(formData.get('hourly_rate')) || null : null,
      monthly_salary: employmentType === 'full_time' ? Number(formData.get('monthly_salary')) || null : null,
      working_days_per_month: Number(formData.get('working_days_per_month')) || 22,
    })
    .eq('id', id)
  redirect('/admin/settings')
}

export async function deleteStaff(staffId: string) {
  const supabase = createClient()
  await supabase.from('staffs').delete().eq('id', staffId)
  redirect('/admin/settings')
}

// ===== 予算・締切設定 =====

export async function updateBudgetSettings(formData: FormData) {
  const supabase = createClient()
  await supabase
    .from('settings')
    .update({
      value: {
        weekday: Number(formData.get('weekday')),
        weekend: Number(formData.get('weekend')),
        min_required: Number(formData.get('min_required')) || 2,
      },
    })
    .eq('key', 'budget')
  redirect('/admin/settings')
}

export async function updateDeadlineSettings(formData: FormData) {
  const supabase = createClient()
  await supabase
    .from('settings')
    .update({
      value: {
        first_half: Number(formData.get('first_half')),
        second_half: Number(formData.get('second_half')),
      },
    })
    .eq('key', 'deadline')
  redirect('/admin/settings')
}

// ===== 日報 =====

export async function upsertDailyReport(formData: FormData) {
  const supabase = createClient()
  const date = formData.get('date') as string
  const revenue = Number(formData.get('revenue')) || null
  const totalLaborCost = Number(formData.get('total_labor_cost')) || 0
  const laborRate =
    revenue && revenue > 0
      ? Math.round((totalLaborCost / revenue) * 1000) / 10
      : null
  let overtimeLogs: unknown[] = []
  try {
    overtimeLogs = JSON.parse((formData.get('overtime_logs') as string) || '[]')
  } catch {
    overtimeLogs = []
  }

  await supabase.from('daily_reports').upsert(
    {
      date,
      revenue,
      total_labor_cost: totalLaborCost,
      labor_rate: laborRate,
      overtime_logs: overtimeLogs,
    },
    { onConflict: 'date' }
  )
  redirect(`/admin/daily/${date}`)
}

// ===== ヘルプミー枠 =====

export async function saveOfferSlot(date: string, startTime: string, endTime: string) {
  const supabase = createClient()
  await supabase.from('offer_slots').upsert(
    {
      date,
      start_time: startTime.length === 5 ? startTime + ':00' : startTime,
      end_time: endTime.length === 5 ? endTime + ':00' : endTime,
    },
    { onConflict: 'date' }
  )
  revalidatePath('/admin', 'layout')
}

export async function deleteOfferSlot(id: string) {
  const supabase = createClient()
  await supabase.from('offer_slots').delete().eq('id', id)
  revalidatePath('/admin', 'layout')
}

// ===== ヘルプ通知 =====

export async function sendOfferNotification(formData: FormData) {
  const supabase = createClient()
  const message = formData.get('message') as string
  await supabase.from('notifications').insert({
    staff_id: null,
    message,
    type: 'offer',
    is_read: false,
  })
  redirect('/admin/offers')
}

// ===== ポイント承認 =====

export async function approvePoint(pointId: string) {
  const supabase = createClient()
  await supabase
    .from('points')
    .update({ approved: true, approved_at: new Date().toISOString() })
    .eq('id', pointId)
  revalidatePath('/admin/points')
}

export async function rejectPoint(pointId: string) {
  const supabase = createClient()
  await supabase.from('points').delete().eq('id', pointId)
  revalidatePath('/admin/points')
}

// ===== シフト時間変更 =====
// 元の時間の保存はDBトリガー(trg_save_original_shift_time)が自動で行う

export async function updateShiftTime(shiftId: string, startTime: string, endTime: string) {
  const supabase = createClient()
  await supabase
    .from('shift_requests')
    .update({
      start_time: startTime.length === 5 ? startTime + ':00' : startTime,
      end_time: endTime.length === 5 ? endTime + ':00' : endTime,
    })
    .eq('id', shiftId)
  revalidatePath('/admin', 'layout')
}

// ===== 取消済みシフトを元の希望時間に復元 =====

export async function restoreShift(shiftId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('shift_requests')
    .select('original_start_time, original_end_time')
    .eq('id', shiftId)
    .single()
  if (data?.original_start_time) {
    await supabase
      .from('shift_requests')
      .update({
        status: 'pending',
        start_time: data.original_start_time,
        end_time: data.original_end_time,
        original_start_time: null,
        original_end_time: null,
      })
      .eq('id', shiftId)
  } else {
    await supabase
      .from('shift_requests')
      .update({ status: 'pending' })
      .eq('id', shiftId)
  }
  revalidatePath('/admin', 'layout')
}

// ===== 管理者がシフトを直接追加 =====

export async function addShiftByAdmin(formData: FormData) {
  const supabase = createClient()
  const date = formData.get('date') as string
  await supabase.from('shift_requests').insert({
    staff_id: formData.get('staff_id') as string,
    date,
    start_time: formData.get('start_time') as string,
    end_time: formData.get('end_time') as string,
    status: 'added',
  })
  revalidatePath('/admin', 'layout')
}

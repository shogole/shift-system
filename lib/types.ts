export type EmploymentType = 'part_time' | 'full_time'
export type ShiftStatus = 'pending' | 'confirmed' | 'rejected' | 'added'
export type NotificationType = 'deadline' | 'offer' | 'confirmed'

export interface Staff {
  id: string
  name: string
  employment_type: EmploymentType
  hourly_rate?: number
  monthly_salary?: number
  working_days_per_month: number
  created_at: string
}

export interface ShiftTemplate {
  id: string
  staff_id: string
  slot: 1 | 2 | 3
  label?: string
  start_time: string  // "10:00:00"
  end_time: string    // "15:00:00"
  days_of_week?: number[]  // [1,3,5] = 月水金
  updated_at: string
}

export interface ShiftRequest {
  id: string
  staff_id: string
  date: string        // "2025-05-01"
  start_time: string  // "10:00:00"
  end_time: string    // "15:00:00"
  status: ShiftStatus
  created_at: string
}

export interface Notification {
  id: string
  staff_id?: string
  message: string
  type: NotificationType
  is_read: boolean
  created_at: string
}

export interface Point {
  id: string
  staff_id: string
  date: string
  amount: number
  reason?: string
  approved: boolean
  approved_at?: string
  created_at: string
}

export interface DailyReport {
  id: string
  date: string
  revenue?: number
  total_labor_cost?: number
  labor_rate?: number
  overtime_logs: Array<{ staff_id: string; minutes: number; reason: string }>
  created_at: string
}

export interface OfferSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  created_at: string
}

export interface Settings {
  budget: { weekday: number; weekend: number }
  deadline: { first_half: number; second_half: number }
  salary_formula: { working_days_per_month: number }
}

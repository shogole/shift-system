import { Staff, ShiftRequest } from '@/lib/types'

function timeToMinutes(time: string): number {
  const parts = time.split(':')
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

export function calculateHours(startTime: string, endTime: string): number {
  return (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60
}

export function calculateShiftCost(
  staff: Staff,
  startTime: string,
  endTime: string
): number {
  if (staff.employment_type === 'part_time') {
    if (!staff.hourly_rate) return 0
    return staff.hourly_rate * calculateHours(startTime, endTime)
  } else {
    if (!staff.monthly_salary) return 0
    return Math.round(staff.monthly_salary / staff.working_days_per_month)
  }
}

export function calculateDailyLaborCost(
  shifts: ShiftRequest[],
  staffMap: Map<string, Staff>
): number {
  return shifts.reduce((total, shift) => {
    const staff = staffMap.get(shift.staff_id)
    if (!staff) return total
    return total + calculateShiftCost(staff, shift.start_time, shift.end_time)
  }, 0)
}

export function calculateLaborRate(laborCost: number, revenue: number): number {
  if (revenue === 0) return 0
  return Math.round((laborCost / revenue) * 1000) / 10
}

export function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function getShiftPeriod(date: string): 'first' | 'second' {
  const day = parseInt(date.split('-')[2])
  return day <= 15 ? 'first' : 'second'
}

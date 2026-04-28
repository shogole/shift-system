import { ShiftRequest, Staff } from '@/lib/types'
import { calculateDailyLaborCost } from '@/lib/calculations'

export interface DayStats {
  date: string
  confirmedCount: number
  pendingCount: number
  laborCost: number
  budget: number
  status: 'ok' | 'over' | 'under' | 'empty'
}

export function buildDayStats(
  date: string,
  shifts: ShiftRequest[],
  staffMap: Map<string, Staff>,
  budget: number,
  minRequired: number
): DayStats {
  const confirmed = shifts.filter(s => s.status === 'confirmed' || s.status === 'added')
  const pending = shifts.filter(s => s.status === 'pending')
  const laborCost = calculateDailyLaborCost(confirmed, staffMap)

  let status: DayStats['status']
  if (confirmed.length === 0) {
    status = 'empty'
  } else if (laborCost > budget) {
    status = 'over'
  } else if (confirmed.length < minRequired) {
    status = 'under'
  } else {
    status = 'ok'
  }

  return { date, confirmedCount: confirmed.length, pendingCount: pending.length, laborCost, budget, status }
}

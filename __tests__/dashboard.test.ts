import { buildDayStats } from '@/lib/dashboard'
import { Staff, ShiftRequest } from '@/lib/types'

const partStaff: Staff = {
  id: 'p1', name: 'Alice', employment_type: 'part_time',
  hourly_rate: 1000, working_days_per_month: 22, created_at: '',
}
const fullStaff: Staff = {
  id: 'f1', name: 'Bob', employment_type: 'full_time',
  monthly_salary: 220000, working_days_per_month: 22, created_at: '',
}
const staffMap = new Map([['p1', partStaff], ['f1', fullStaff]])

function makeShift(id: string, staffId: string, status: ShiftRequest['status']): ShiftRequest {
  return { id, staff_id: staffId, date: '2026-05-01', start_time: '10:00:00', end_time: '15:00:00', status, created_at: '' }
}

describe('buildDayStats', () => {
  test('no shifts → status empty, laborCost 0', () => {
    const r = buildDayStats('2026-05-01', [], staffMap, 45000, 2)
    expect(r.status).toBe('empty')
    expect(r.laborCost).toBe(0)
    expect(r.confirmedCount).toBe(0)
  })

  test('confirmed < minRequired → status under', () => {
    const r = buildDayStats('2026-05-01', [makeShift('s1', 'p1', 'confirmed')], staffMap, 45000, 2)
    expect(r.status).toBe('under')
    expect(r.confirmedCount).toBe(1)
  })

  test('laborCost > budget → status over', () => {
    // full_time daily = 220000/22 = 10000, part_time 5h*1000 = 5000, total 15000 > 5000 (budget)
    const r = buildDayStats('2026-05-01', [
      makeShift('s1', 'f1', 'confirmed'),
      makeShift('s2', 'p1', 'confirmed'),
    ], staffMap, 5000, 2)
    expect(r.status).toBe('over')
    expect(r.laborCost).toBe(15000)
  })

  test('meets minRequired and under budget → status ok', () => {
    const r = buildDayStats('2026-05-01', [
      makeShift('s1', 'p1', 'confirmed'),
      makeShift('s2', 'p1', 'confirmed'),
    ], staffMap, 45000, 2)
    expect(r.status).toBe('ok')
    expect(r.confirmedCount).toBe(2)
  })

  test('pending shifts counted separately, not as confirmed', () => {
    const r = buildDayStats('2026-05-01', [
      makeShift('s1', 'p1', 'confirmed'),
      makeShift('s2', 'f1', 'pending'),
    ], staffMap, 45000, 2)
    expect(r.confirmedCount).toBe(1)
    expect(r.pendingCount).toBe(1)
  })

  test('added status counts as confirmed for labor cost', () => {
    const r = buildDayStats('2026-05-01', [
      makeShift('s1', 'p1', 'added'),
      makeShift('s2', 'p1', 'confirmed'),
    ], staffMap, 45000, 2)
    expect(r.confirmedCount).toBe(2)
    expect(r.status).toBe('ok')
  })
})

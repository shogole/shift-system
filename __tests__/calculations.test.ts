import {
  calculateHours,
  calculateShiftCost,
  calculateDailyLaborCost,
  calculateLaborRate,
  formatTime,
  getShiftPeriod,
} from '@/lib/calculations'
import { Staff, ShiftRequest } from '@/lib/types'

describe('calculateHours', () => {
  it('5時間のシフトを正しく計算する', () => {
    expect(calculateHours('10:00:00', '15:00:00')).toBe(5)
  })
  it('7時間30分のシフトを正しく計算する', () => {
    expect(calculateHours('10:00:00', '17:30:00')).toBe(7.5)
  })
  it('深夜をまたがないシフトで正しく計算する', () => {
    expect(calculateHours('17:00:00', '22:00:00')).toBe(5)
  })
})

describe('calculateShiftCost', () => {
  const partTimeStaff: Staff = {
    id: '1', name: '田中', employment_type: 'part_time',
    hourly_rate: 1200, working_days_per_month: 22, created_at: ''
  }
  const fullTimeStaff: Staff = {
    id: '2', name: '佐藤', employment_type: 'full_time',
    monthly_salary: 220000, working_days_per_month: 22, created_at: ''
  }

  it('アルバイト: 時給×時間を計算する', () => {
    expect(calculateShiftCost(partTimeStaff, '10:00:00', '15:00:00')).toBe(6000)
  })
  it('社員: 月給÷稼働日数を計算する', () => {
    expect(calculateShiftCost(fullTimeStaff, '09:00:00', '18:00:00')).toBe(10000)
  })
  it('時給なしのアルバイトは0を返す', () => {
    const noRate: Staff = { ...partTimeStaff, hourly_rate: undefined }
    expect(calculateShiftCost(noRate, '10:00:00', '15:00:00')).toBe(0)
  })
})

describe('calculateDailyLaborCost', () => {
  const staff1: Staff = {
    id: '1', name: '田中', employment_type: 'part_time',
    hourly_rate: 1200, working_days_per_month: 22, created_at: ''
  }
  const staff2: Staff = {
    id: '2', name: '鈴木', employment_type: 'part_time',
    hourly_rate: 1100, working_days_per_month: 22, created_at: ''
  }
  const shifts: ShiftRequest[] = [
    { id: 'a', staff_id: '1', date: '2025-05-01', start_time: '10:00:00', end_time: '15:00:00', status: 'confirmed', created_at: '' },
    { id: 'b', staff_id: '2', date: '2025-05-01', start_time: '10:00:00', end_time: '16:00:00', status: 'confirmed', created_at: '' },
  ]
  const staffMap = new Map([['1', staff1], ['2', staff2]])

  it('複数スタッフの人件費合計を計算する', () => {
    expect(calculateDailyLaborCost(shifts, staffMap)).toBe(12600)
  })
  it('シフトが空の場合は0を返す', () => {
    expect(calculateDailyLaborCost([], staffMap)).toBe(0)
  })
})

describe('calculateLaborRate', () => {
  it('人件費率を小数点1桁で返す', () => {
    expect(calculateLaborRate(42000, 185000)).toBe(22.7)
  })
  it('売上が0の場合は0を返す', () => {
    expect(calculateLaborRate(42000, 0)).toBe(0)
  })
})

describe('formatTime', () => {
  it('HH:MM:SS を HH:MM に変換する', () => {
    expect(formatTime('10:00:00')).toBe('10:00')
  })
  it('すでに HH:MM 形式はそのまま返す', () => {
    expect(formatTime('10:00')).toBe('10:00')
  })
})

describe('getShiftPeriod', () => {
  it('1〜15日は "first" を返す', () => {
    expect(getShiftPeriod('2025-05-01')).toBe('first')
    expect(getShiftPeriod('2025-05-15')).toBe('first')
  })
  it('16〜末日は "second" を返す', () => {
    expect(getShiftPeriod('2025-05-16')).toBe('second')
    expect(getShiftPeriod('2025-05-31')).toBe('second')
  })
})

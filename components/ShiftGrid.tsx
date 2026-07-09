'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Staff, ShiftRequest, OfferSlot } from '@/lib/types'
import { calculateHours } from '@/lib/calculations'
import { confirmShift, rejectShift, updateShiftTime, saveOfferSlot, deleteOfferSlot, restoreShift } from '@/app/admin/actions'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function formatShortTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  return m === 0 ? String(h) : `${h}:${m.toString().padStart(2, '0')}`
}

function formatTimeInput(time: string): string {
  return time.slice(0, 5) // "HH:MM"
}

// 出勤時間帯を判定
function getTimeCategory(startTime: string): 'morning' | 'midday' | 'evening' | null {
  const h = parseInt(startTime.split(':')[0])
  if (h >= 6 && h <= 8) return 'morning'
  if (h >= 9 && h <= 13) return 'midday'
  if (h >= 16) return 'evening'
  return null
}

// スタッフの代表時間帯（最頻値）
function getStaffCategory(staffShifts: ShiftRequest[]): 'morning' | 'midday' | 'evening' | null {
  if (staffShifts.length === 0) return null
  const counts = { morning: 0, midday: 0, evening: 0 }
  staffShifts.forEach(s => {
    const cat = getTimeCategory(s.start_time)
    if (cat) counts[cat]++
  })
  const max = Math.max(...Object.values(counts))
  if (max === 0) return null
  return (Object.entries(counts).find(([, v]) => v === max)?.[0] ?? null) as 'morning' | 'midday' | 'evening' | null
}

const CATEGORY_STYLE = {
  fulltime: { row: 'bg-yellow-50', text: 'text-yellow-800', badge: '社員', badgeBg: 'bg-yellow-100 text-yellow-700' },
  morning:  { row: 'bg-blue-50', text: 'text-blue-800', badge: '朝', badgeBg: 'bg-blue-100 text-blue-700' },
  midday:   { row: 'bg-green-50', text: 'text-green-800', badge: '昼', badgeBg: 'bg-green-100 text-green-700' },
  evening:  { row: 'bg-purple-50', text: 'text-purple-800', badge: '夜', badgeBg: 'bg-purple-100 text-purple-700' },
}

interface Props {
  staffs: Staff[]
  dates: string[]
  shifts: ShiftRequest[]
  activeMonth: number
  offerSlots: OfferSlot[]
}

export default function ShiftGrid({ staffs, dates, shifts, activeMonth, offerSlots }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editingSlotDate, setEditingSlotDate] = useState<string | null>(null)
  const [slotStart, setSlotStart] = useState('10:00')
  const [slotEnd, setSlotEnd] = useState('15:00')

  // staffId -> date -> ShiftRequest
  const shiftMap = new Map<string, Map<string, ShiftRequest>>()
  shifts.forEach(shift => {
    if (!shiftMap.has(shift.staff_id)) shiftMap.set(shift.staff_id, new Map())
    shiftMap.get(shift.staff_id)!.set(shift.date, shift)
  })

  function handleConfirm(shiftId: string) {
    startTransition(async () => {
      await confirmShift(shiftId)
      router.refresh()
    })
  }

  function handleReject(shiftId: string) {
    startTransition(async () => {
      await rejectShift(shiftId)
      router.refresh()
    })
  }

  function handleRestore(shiftId: string) {
    startTransition(async () => {
      await restoreShift(shiftId)
      router.refresh()
    })
  }

  function startEditSlot(date: string, slot: OfferSlot | null) {
    setEditingSlotDate(date)
    setSlotStart(slot ? formatTimeInput(slot.start_time) : '10:00')
    setSlotEnd(slot ? formatTimeInput(slot.end_time) : '15:00')
  }

  function handleSaveSlot(date: string) {
    startTransition(async () => {
      await saveOfferSlot(date, slotStart, slotEnd)
      setEditingSlotDate(null)
      router.refresh()
    })
  }

  function handleDeleteSlot(id: string) {
    startTransition(async () => {
      await deleteOfferSlot(id)
      router.refresh()
    })
  }

  function startEdit(shift: ShiftRequest) {
    setEditingId(shift.id)
    setEditStart(formatTimeInput(shift.start_time))
    setEditEnd(formatTimeInput(shift.end_time))
  }

  function handleSaveTime(shiftId: string) {
    startTransition(async () => {
      await updateShiftTime(shiftId, editStart, editEnd)
      setEditingId(null)
      router.refresh()
    })
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="border-collapse text-xs whitespace-nowrap">
        <thead>
          <tr className="bg-gray-50">
            <th className="border-r border-b border-gray-200 px-3 py-2 text-left font-bold text-gray-500 sticky left-0 bg-gray-50 z-10 min-w-[88px]">
              スタッフ
            </th>
            {dates.map(date => {
              const d = new Date(date + 'T00:00:00')
              const day = d.getDate()
              const dow = d.getDay()
              return (
                <th
                  key={date}
                  className={`border-r border-b border-gray-200 px-2 py-1.5 text-center min-w-[80px] font-normal ${
                    dow === 0 ? 'text-red-500 bg-red-50' : dow === 6 ? 'text-blue-500 bg-blue-50' : 'text-gray-600'
                  }`}
                >
                  <Link href={`/admin/day/${date}`} className="hover:underline block">
                    <div className="font-bold">{activeMonth}/{day}</div>
                    <div className="text-[10px] opacity-70">{DOW_LABELS[dow]}</div>
                  </Link>
                </th>
              )
            })}
          </tr>
          <tr className="bg-blue-50">
            <td className="border-r border-b border-gray-200 px-3 py-1 font-bold text-blue-600 sticky left-0 bg-blue-50 z-10">
              確定人数
            </td>
            {dates.map(date => {
              const count = shifts.filter(
                s => s.date === date && (s.status === 'confirmed' || s.status === 'added')
              ).length
              return (
                <td key={date} className="border-r border-b border-gray-200 px-2 py-1 text-center font-bold text-blue-600">
                  {count > 0 ? count : ''}
                </td>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {staffs.map(staff => {
            const staffShifts = Array.from(shiftMap.get(staff.id)?.values() ?? [])
            const category = staff.employment_type === 'full_time'
              ? 'fulltime'
              : getStaffCategory(staffShifts)
            const catStyle = category ? CATEGORY_STYLE[category] : null

            return (
              <tr key={staff.id}>
                <td className={`border-r border-b border-gray-200 px-2 py-1.5 sticky left-0 z-10 ${catStyle ? catStyle.row : 'bg-white'}`}>
                  <div className={`font-bold ${catStyle ? catStyle.text : 'text-brand-dark'}`}>{staff.name}</div>
                  {catStyle && (
                    <span className={`text-[10px] px-1 rounded ${catStyle.badgeBg}`}>{catStyle.badge}</span>
                  )}
                </td>
                {dates.map(date => {
                  const shift = shiftMap.get(staff.id)?.get(date)
                  if (!shift) return <td key={date} className="border-r border-b border-gray-200" />

                  const hours = Math.round(calculateHours(shift.start_time, shift.end_time) * 10) / 10
                  const timeStr = `${formatShortTime(shift.start_time)}-${formatShortTime(shift.end_time)}`
                  const isEditing = editingId === shift.id

                  if (isEditing) {
                    return (
                      <td key={date} className="border-r border-b border-gray-200 bg-yellow-50 p-1">
                        <input
                          type="time"
                          value={editStart}
                          onChange={e => setEditStart(e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-[10px] mb-0.5"
                        />
                        <input
                          type="time"
                          value={editEnd}
                          onChange={e => setEditEnd(e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-[10px] mb-1"
                        />
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => handleSaveTime(shift.id)}
                            className="flex-1 bg-brand-dark text-white rounded px-1 py-0.5 text-[10px] font-bold"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex-1 bg-gray-100 text-gray-500 rounded px-1 py-0.5 text-[10px]"
                          >
                            取消
                          </button>
                        </div>
                      </td>
                    )
                  }

                  if (shift.status === 'pending') {
                    return (
                      <td key={date} className="border-r border-b border-gray-200 bg-amber-50 px-1 py-1 text-center">
                        <button onClick={() => startEdit(shift)} className="font-bold text-amber-800 hover:underline block w-full">
                          {timeStr}
                        </button>
                        <div className="text-gray-400 mb-0.5">{hours}</div>
                        <div className="flex gap-0.5 justify-center">
                          <button
                            onClick={() => handleConfirm(shift.id)}
                            className="bg-green-500 text-white rounded px-1.5 py-0.5 text-[10px] font-bold hover:bg-green-600"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleReject(shift.id)}
                            className="bg-red-400 text-white rounded px-1.5 py-0.5 text-[10px] font-bold hover:bg-red-500"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    )
                  }

                  if (shift.status === 'confirmed' || shift.status === 'added') {
                    const cellBg = shift.status === 'added' ? 'bg-orange-50' : 'bg-green-50'
                    const textColor = shift.status === 'added' ? 'text-orange-700' : 'text-green-800'
                    return (
                      <td key={date} className={`border-r border-b border-gray-200 ${cellBg} px-1 py-1 text-center`}>
                        <button onClick={() => startEdit(shift)} className={`font-bold ${textColor} hover:underline block w-full`}>
                          {timeStr}
                        </button>
                        <div className="text-gray-400 mb-0.5">{hours}</div>
                        <button
                          onClick={() => handleReject(shift.id)}
                          className="text-gray-300 hover:text-red-400 text-[10px] transition-colors"
                        >
                          取消
                        </button>
                      </td>
                    )
                  }

                  return (
                    <td key={date} className="border-r border-b border-gray-200 bg-red-50 px-1.5 py-1 text-center">
                      <button
                        onClick={() => handleRestore(shift.id)}
                        className="text-red-300 line-through text-[10px] hover:text-green-500 transition-colors cursor-pointer"
                      >
                        {timeStr}
                      </button>
                    </td>
                  )
                })}
              </tr>
            )
          })}
            {/* ヘルプミー行 */}
            <tr className="bg-red-50">
              <td className="border-r border-b border-gray-200 px-2 py-1.5 font-bold text-red-600 sticky left-0 bg-red-50 z-10 text-xs">
                🆘 ヘルプミー
              </td>
              {dates.map(date => {
                const slot = offerSlots.find(s => s.date === date)
                const isEditing = editingSlotDate === date

                if (isEditing) {
                  return (
                    <td key={date} className="border-r border-b border-gray-200 bg-red-50 p-1">
                      <input type="time" value={slotStart} onChange={e => setSlotStart(e.target.value)}
                        className="w-full border rounded px-1 py-0.5 text-[10px] mb-0.5" />
                      <input type="time" value={slotEnd} onChange={e => setSlotEnd(e.target.value)}
                        className="w-full border rounded px-1 py-0.5 text-[10px] mb-1" />
                      <div className="flex gap-0.5">
                        <button onClick={() => handleSaveSlot(date)}
                          className="flex-1 bg-red-500 text-white rounded px-1 py-0.5 text-[10px] font-bold">
                          保存
                        </button>
                        <button onClick={() => setEditingSlotDate(null)}
                          className="flex-1 bg-gray-100 text-gray-500 rounded px-1 py-0.5 text-[10px]">
                          取消
                        </button>
                      </div>
                    </td>
                  )
                }

                if (slot) {
                  return (
                    <td key={date} className="border-r border-b border-gray-200 bg-red-100 px-1 py-1 text-center">
                      <button onClick={() => startEditSlot(date, slot)}
                        className="font-bold text-red-700 text-[10px] hover:underline block w-full">
                        {formatShortTime(slot.start_time)}-{formatShortTime(slot.end_time)}
                      </button>
                      <button onClick={() => handleDeleteSlot(slot.id)}
                        className="text-red-300 hover:text-red-500 text-[10px]">
                        削除
                      </button>
                    </td>
                  )
                }

                return (
                  <td key={date} className="border-r border-b border-gray-200 bg-red-50 text-center">
                    <button onClick={() => startEditSlot(date, null)}
                      className="text-red-300 hover:text-red-500 text-lg leading-none">
                      +
                    </button>
                  </td>
                )
              })}
            </tr>
        </tbody>
      </table>
    </div>
  )
}

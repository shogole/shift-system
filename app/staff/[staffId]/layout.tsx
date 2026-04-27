import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { staffId: string }
}) {
  const supabase = createClient()
  const { data: staff } = await supabase
    .from('staffs')
    .select('id, name')
    .eq('id', params.staffId)
    .single()

  if (!staff) notFound()

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-brand-dark text-white px-4 py-3">
        <h2 className="text-brand-gold font-bold">{staff.name} さん</h2>
        <p className="text-gray-400 text-xs mt-0.5">キッチンラボ シフト管理</p>
      </header>
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      <BottomNav staffId={params.staffId} />
    </div>
  )
}

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminSideNav from '@/components/AdminSideNav'

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = cookies().get('admin_session')
  if (!session || session.value !== 'authenticated') {
    redirect('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSideNav />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

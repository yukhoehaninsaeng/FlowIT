import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-[220px]">
        <Topbar title="FlowIT CRM" />
        <main className="pt-14 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

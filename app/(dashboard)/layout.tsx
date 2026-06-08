export const dynamic = 'force-dynamic'

import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { SidebarProvider } from '@/components/layout/SidebarContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        <Sidebar />
        <div className="lg:ml-[220px]">
          <Topbar title="FlowIT CRM" />
          <main className="pt-14 px-4 pb-4 lg:px-6 lg:pb-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

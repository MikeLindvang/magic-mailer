import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Header } from "@/components/shell/header"
import { Sidebar } from "@/components/shell/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-parchment bg-grain">
      <Header />
      <div className="flex">
        <aside className="hidden md:block">
          <Sidebar />
        </aside>
        <main className="flex-1 max-w-[90rem] mx-auto p-8 lg:p-12">
          <div className="max-w-[80rem] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

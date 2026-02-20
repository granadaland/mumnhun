import { requireAdminPage } from "@/lib/security/admin"
import { AdminSidebar } from "@/components/admin/sidebar"

export const metadata = {
    title: "Admin Dashboard",
    robots: { index: false, follow: false },
}

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Ensure user is authenticated and authorized as ADMIN
    await requireAdminPage()

    return (
        <div className="min-h-screen bg-[#0F0A09] flex text-[#F9F6F0]">
            <AdminSidebar />
            <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
                {/* Top Bar */}
                <header className="h-16 border-b border-[#D4BCAA]/5 bg-[#1A1513]/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-8 sticky top-0 z-30">
                    <div className="lg:hidden w-10" /> {/* Spacer for mobile menu button */}
                    <h2 className="text-[#A89A8E] font-medium text-sm hidden lg:block uppercase tracking-widest">
                        Admin Dashboard
                    </h2>
                    <div className="flex items-center gap-3">
                        <a
                            href="/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[#D4BCAA]/50 hover:text-[#466A68] transition-colors"
                        >
                            Lihat Website →
                        </a>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}

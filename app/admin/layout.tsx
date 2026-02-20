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
        <div className="min-h-screen bg-[#F9F6F0] flex text-[#0F0A09]">
            <AdminSidebar />
            <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
                {/* Top Bar */}
                <header className="h-16 border-b border-[#D4BCAA]/20 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-8 sticky top-0 z-30">
                    <div className="lg:hidden w-10" /> {/* Spacer for mobile menu button */}
                    <h2 className="text-[#8C7A6B] font-semibold text-sm hidden lg:block uppercase tracking-widest">
                        Admin Dashboard
                    </h2>
                    <div className="flex items-center gap-4">
                        <a
                            href="/"
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white border border-[#D4BCAA]/20 text-xs font-medium px-3 py-1.5 rounded-lg text-[#8C7A6B] hover:text-[#466A68] hover:border-[#466A68]/30 hover:bg-[#466A68]/5 transition-all shadow-sm"
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

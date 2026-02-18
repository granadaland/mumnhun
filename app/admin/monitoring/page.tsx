import { getAdminMonitoringSnapshot } from "@/lib/observability/admin-alerts"
import { Activity, AlertTriangle, ShieldAlert, ServerCrash } from "lucide-react"

function formatWindowLabel(fromIso: string, toIso: string): string {
    const from = new Date(fromIso)
    const to = new Date(toIso)

    const formatter = new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    })

    return `${formatter.format(from)} - ${formatter.format(to)}`
}

export default function AdminMonitoringPage() {
    const snapshot = getAdminMonitoringSnapshot({ windowMs: 24 * 60 * 60 * 1000, topEndpointsLimit: 8 })
    const windowLabel = formatWindowLabel(snapshot.fromIso, snapshot.toIso)

    const metricCards = [
        {
            label: "401/403",
            value: snapshot.unauthorizedCount,
            icon: <ShieldAlert className="h-5 w-5" />,
            hint: "Unauthorized + Forbidden",
            cardClass: "border-amber-500/25 bg-amber-500/8",
            iconClass: "text-amber-400",
        },
        {
            label: "500+",
            value: snapshot.serverErrorCount,
            icon: <ServerCrash className="h-5 w-5" />,
            hint: "Server error",
            cardClass: "border-red-500/25 bg-red-500/8",
            iconClass: "text-red-400",
        },
        {
            label: "AI Task Failed",
            value: snapshot.aiTaskFailureCount,
            icon: <AlertTriangle className="h-5 w-5" />,
            hint: "notifyAiTaskFailure",
            cardClass: "border-violet-500/25 bg-violet-500/8",
            iconClass: "text-violet-400",
        },
        {
            label: "Total Event",
            value: snapshot.totalEvents,
            icon: <Activity className="h-5 w-5" />,
            hint: "Semua event teramati",
            cardClass: "border-[#466A68]/25 bg-[#466A68]/8",
            iconClass: "text-[#7ca3a0]",
        },
    ]

    return (
        <div className="space-y-8">
            <div className="rounded-2xl border border-[#466A68]/25 bg-gradient-to-br from-[#466A68]/15 via-[#2a2018] to-[#2a2018] p-6 lg:p-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#466A68]/20 text-[#7ca3a0]">
                        <Activity className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[#F4EEE7]">Monitoring Operasional</h1>
                        <p className="text-xs text-[#D4BCAA]/50">Ringkasan metrik 24 jam terakhir untuk admin API</p>
                    </div>
                </div>
                <p className="mt-4 text-xs text-[#D4BCAA]/45">Window: {windowLabel}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metricCards.map((card) => (
                    <div key={card.label} className={`rounded-xl border p-4 ${card.cardClass}`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[11px] uppercase tracking-wide text-[#D4BCAA]/50">{card.label}</p>
                                <p className="mt-2 text-3xl font-bold text-[#F4EEE7] tabular-nums">{card.value}</p>
                                <p className="mt-1 text-[11px] text-[#D4BCAA]/45">{card.hint}</p>
                            </div>
                            <div className={card.iconClass}>{card.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            <section className="rounded-xl border border-[#D4BCAA]/10 bg-[#2a2018] overflow-hidden">
                <div className="border-b border-[#D4BCAA]/10 px-5 py-4">
                    <h2 className="text-sm font-semibold text-[#F4EEE7]">Top Endpoint (24 Jam)</h2>
                    <p className="mt-1 text-xs text-[#D4BCAA]/40">Berdasarkan field action dari event request admin</p>
                </div>

                {snapshot.topEndpoints.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-[#D4BCAA]/35">Belum ada event request yang tercatat.</div>
                ) : (
                    <div className="divide-y divide-[#D4BCAA]/5">
                        {snapshot.topEndpoints.map((endpoint, index) => (
                            <div key={endpoint.action} className="flex items-center justify-between px-5 py-3">
                                <div className="min-w-0">
                                    <p className="text-sm text-[#F4EEE7] truncate">#{index + 1} {endpoint.action}</p>
                                </div>
                                <span className="rounded-full bg-[#466A68]/20 px-3 py-1 text-xs font-semibold text-[#7ca3a0] tabular-nums">
                                    {endpoint.count}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}

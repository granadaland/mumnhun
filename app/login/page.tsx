"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"

function getSafeRedirectPath(input: string | null): string {
    if (!input) return "/admin"
    if (!input.startsWith("/")) return "/admin"
    if (input.startsWith("//")) return "/admin"

    const normalized = input.toLowerCase()
    if (normalized.includes("://")) return "/admin"
    if (normalized.startsWith("/javascript:")) return "/admin"
    if (normalized.startsWith("/data:")) return "/admin"

    return input
}

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirect = getSafeRedirectPath(searchParams.get("redirect"))

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        router.push(redirect)
        router.refresh()
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1412] via-[#2a2018] to-[#1a1412] px-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#466A68]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#D4BCAA]/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Image
                        src="https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769979416/Logo_MumNhun_krpo1l.webp"
                        alt="Mum 'N Hun Logo"
                        width={160}
                        height={64}
                        className="mx-auto mb-4 brightness-110"
                    />
                    <p className="text-[#D4BCAA]/60 text-sm">Admin Dashboard</p>
                </div>

                {/* Login Card */}
                <div className="bg-[#2a2018]/80 backdrop-blur-xl border border-[#D4BCAA]/10 rounded-2xl p-8 shadow-2xl">
                    <h1 className="text-2xl font-bold text-[#F4EEE7] mb-6 text-center">
                        Masuk ke Dashboard
                    </h1>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-[#D4BCAA]/80 mb-2"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@mumnhun.id"
                                required
                                className="w-full px-4 py-3 bg-[#1a1412] border border-[#D4BCAA]/15 rounded-xl text-[#F4EEE7] placeholder-[#D4BCAA]/30 focus:outline-none focus:ring-2 focus:ring-[#466A68]/50 focus:border-[#466A68] transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-[#D4BCAA]/80 mb-2"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-4 py-3 bg-[#1a1412] border border-[#D4BCAA]/15 rounded-xl text-[#F4EEE7] placeholder-[#D4BCAA]/30 focus:outline-none focus:ring-2 focus:ring-[#466A68]/50 focus:border-[#466A68] transition-all"
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm px-4 py-3 rounded-xl">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white font-semibold rounded-xl hover:from-[#3a5856] hover:to-[#466A68] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-[#466A68]/20"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                        />
                                    </svg>
                                    Memproses...
                                </span>
                            ) : (
                                "Masuk"
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-[#D4BCAA]/30 text-xs mt-6">
                    © {new Date().getFullYear()} Mum &apos;n&apos; Hun. Admin Area.
                </p>
            </div>
        </div>
    )
}

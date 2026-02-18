import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

/**
 * Get authenticated user or redirect to login
 */
export async function requireAuth() {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error || !user) {
        redirect("/login")
    }

    return user
}

/**
 * Get authenticated user (returns null if not authenticated)
 */
export async function getUser() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    return user
}

/**
 * Sign out and redirect to login
 */
export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/login")
}

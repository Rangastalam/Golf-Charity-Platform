/**
 * @fileoverview Admin layout — server component.
 *
 * Verifies the session user is an admin (defence-in-depth on top of
 * middleware). Passes normalised user data to AdminShell for rendering.
 */

import { redirect }  from 'next/navigation'
import { cookies }   from 'next/headers'
import { requireAdmin } from '@/lib/auth'
import AdminShell       from '@/components/admin/AdminShell'

/**
 * @param {{ children: React.ReactNode }} props
 */
export default async function AdminLayout({ children }) {
  const cookieStore = await cookies()

  let auth
  try {
    auth = await requireAdmin(cookieStore)
  } catch (err) {
    if (err?.status === 401) redirect('/login')
    redirect('/')            // 403 — authenticated but not admin
  }

  const { profile } = auth

  const shellUser = {
    displayName: profile.full_name || profile.email.split('@')[0],
    email:       profile.email,
    avatarUrl:   profile.avatar_url ?? null,
  }

  return (
    <AdminShell user={shellUser}>
      {children}
    </AdminShell>
  )
}

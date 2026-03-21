/**
 * @fileoverview Admin individual user page — client component.
 *
 * Full profile, subscription override, scores, charity, wins, danger zone.
 */

'use client'

import { useState, useEffect, use } from 'react'
import { useRouter }                from 'next/navigation'
import Link                         from 'next/link'
import { motion, AnimatePresence }  from 'framer-motion'
import { formatMatchType, deriveDisplayStatus, getStatusColors } from '@/lib/winnerHelpers'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Badge({ label, cls }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  )
}

function SectionCard({ title, children }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 space-y-4">
      <h2 className="text-sm md:text-base font-bold text-gray-900">{title}</h2>
      {children}
    </section>
  )
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection({ profile, onSaved }) {
  const [name,    setName]    = useState(profile.full_name ?? '')
  const [email,   setEmail]   = useState(profile.email ?? '')
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState(null)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const res  = await fetch(`/api/admin/users/${profile.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ full_name: name, email }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setMsg({ error: json.error }); return }
    setMsg({ success: 'Saved.' })
    onSaved?.()
  }

  return (
    <SectionCard title="Profile">
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Full name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px]"
            />
          </div>
        </div>
        {msg && (
          <p className={`text-xs ${msg.error ? 'text-red-600' : 'text-green-700'}`}>
            {msg.error ?? msg.success}
          </p>
        )}
        <button type="submit" disabled={saving}
          className="w-full sm:w-auto bg-red-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-red-900 disabled:opacity-50 transition-colors min-h-[44px]">
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </SectionCard>
  )
}

// ─── Subscription section ─────────────────────────────────────────────────────

function SubscriptionSection({ sub, userId, onSaved }) {
  const [override, setOverride] = useState(sub?.status ?? '')
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)

  async function save() {
    if (!override) return
    setSaving(true)
    setMsg(null)
    const res  = await fetch(`/api/admin/users/${userId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subscription_status: override }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setMsg({ error: json.error }); return }
    setMsg({ success: 'Status updated.' })
    onSaved?.()
  }

  const statusBadge = {
    active:    'bg-green-100 text-green-700',
    lapsed:    'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
    inactive:  'bg-gray-100 text-gray-600',
  }

  if (!sub) {
    return (
      <SectionCard title="Subscription">
        <p className="text-sm text-gray-400">No subscription record.</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Subscription">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-400">Plan</p>
          <p className="font-semibold capitalize">{sub.plan ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Status</p>
          <Badge label={sub.status} cls={statusBadge[sub.status] ?? 'bg-gray-100 text-gray-600'} />
        </div>
        <div>
          <p className="text-xs text-gray-400">Renews / Ends</p>
          <p className="font-semibold">
            {sub.current_period_end
              ? new Date(sub.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'}
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100 space-y-3">
        <p className="text-xs font-semibold text-gray-500">Override status</p>
        <div className="flex flex-wrap gap-2">
          {['active', 'lapsed', 'cancelled', 'inactive'].map((s) => (
            <button
              key={s}
              onClick={() => setOverride(s)}
              className={[
                'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors min-h-[32px] capitalize',
                override === s ? 'bg-red-900 text-white border-red-900' : 'border-gray-200 text-gray-600 hover:border-gray-400',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>
        {msg && (
          <p className={`text-xs ${msg.error ? 'text-red-600' : 'text-green-700'}`}>
            {msg.error ?? msg.success}
          </p>
        )}
        <button onClick={save} disabled={saving || override === sub.status}
          className="w-full sm:w-auto bg-red-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-red-900 disabled:opacity-50 transition-colors min-h-[44px]">
          {saving ? 'Saving…' : 'Apply Override'}
        </button>
      </div>
    </SectionCard>
  )
}

// ─── Scores section ───────────────────────────────────────────────────────────

function ScoresSection({ initialScores, userId }) {
  const [scores,  setScores]  = useState(initialScores)
  const [editing, setEditing] = useState(null) // { id, value }
  const [deleting, setDeleting] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState(null)

  async function saveEdit() {
    setSaving(true)
    const res  = await fetch(`/api/scores/${editing.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ score: Number(editing.value) }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setMsg(json.error); return }
    setScores((prev) => prev.map((s) => s.id === editing.id ? { ...s, gross_score: Number(editing.value) } : s))
    setEditing(null)
  }

  async function deleteScore(id) {
    setSaving(true)
    const res  = await fetch('/api/scores', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setSaving(false)
    if (!res.ok) { return }
    setScores((prev) => prev.filter((s) => s.id !== id))
    setDeleting(null)
  }

  return (
    <SectionCard title={`Scores (${scores.length})`}>
      {scores.length === 0
        ? <p className="text-sm text-gray-400">No scores on record.</p>
        : (
          <div className="space-y-2">
            {scores.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                {editing?.id === s.id ? (
                  <>
                    <input
                      type="number" min={1} max={45}
                      value={editing.value}
                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                      className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center"
                    />
                    <button onClick={saveEdit} disabled={saving}
                      className="text-xs font-semibold text-green-700 hover:text-green-900 min-h-[36px] px-3">
                      Save
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="text-xs text-gray-400 hover:text-gray-700 min-h-[36px] px-2">
                      Cancel
                    </button>
                  </>
                ) : deleting === s.id ? (
                  <>
                    <p className="text-sm text-gray-700 flex-1">Delete <strong>{s.gross_score} pts</strong>?</p>
                    <button onClick={() => deleteScore(s.id)} disabled={saving}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 min-h-[36px] px-3">
                      Yes
                    </button>
                    <button onClick={() => setDeleting(null)}
                      className="text-xs text-gray-400 hover:text-gray-700 min-h-[36px] px-2">
                      No
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xl font-black text-gray-900 w-8 text-right">{s.gross_score}</span>
                    <span className="text-xs text-gray-400 flex-1">
                      {s.course_name && `${s.course_name} · `}
                      {new Date(s.played_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                    <button onClick={() => setEditing({ id: s.id, value: String(s.gross_score) })}
                      className="text-xs text-gray-400 hover:text-gray-700 min-h-[36px] w-8 flex items-center justify-center">
                      ✎
                    </button>
                    <button onClick={() => setDeleting(s.id)}
                      className="text-xs text-red-400 hover:text-red-700 min-h-[36px] w-8 flex items-center justify-center">
                      ✕
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )
      }
      {msg && <p className="text-xs text-red-600">{msg}</p>}
    </SectionCard>
  )
}

// ─── Danger zone ──────────────────────────────────────────────────────────────

function DangerZone({ userId }) {
  const [confirm,  setConfirm]  = useState('')
  const [deleting, setDeleting] = useState(false)
  const [show,     setShow]     = useState(false)
  const [error,    setError]    = useState(null)
  const router = useRouter()

  async function handleDelete(e) {
    e.preventDefault()
    if (confirm !== 'DELETE') return
    setDeleting(true)
    const res  = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setDeleting(false); return }
    router.push('/admin/users')
  }

  return (
    <section className="bg-white rounded-2xl border border-red-200 p-4 md:p-6 space-y-3">
      <h2 className="text-sm md:text-base font-bold text-red-700">Danger Zone</h2>
      <p className="text-xs md:text-sm text-gray-500">
        Permanently deletes this user's account, scores, entries, wins, and subscriptions.
      </p>
      {!show ? (
        <button onClick={() => setShow(true)}
          className="w-full sm:w-auto border border-red-300 text-red-600 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-red-50 transition-colors min-h-[44px]">
          Delete Account
        </button>
      ) : (
        <form onSubmit={handleDelete} className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Type <span className="font-black text-red-600">DELETE</span> to confirm:</p>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-red-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 min-h-[44px]"
            placeholder="DELETE" autoComplete="off" />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={() => { setShow(false); setConfirm(''); setError(null) }}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px]">
              Cancel
            </button>
            <button type="submit" disabled={confirm !== 'DELETE' || deleting}
              className="flex-1 bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-40 transition-colors min-h-[44px]">
              {deleting ? 'Deleting…' : 'Confirm Delete'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage({ params }) {
  const { id }        = use(params)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/users/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl">
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">{error}</div>
      </div>
    )
  }

  const { profile, subscription, scores, charity, winners } = data

  return (
    <div className="space-y-4 md:space-y-6 max-w-3xl">
      {/* Back + Header */}
      <div>
        <Link href="/admin/users" className="text-xs font-semibold text-red-700 hover:text-red-900 mb-3 inline-block">
          ← Back to Users
        </Link>
        <h1 className="text-xl md:text-2xl font-black text-gray-900">
          {profile.full_name || profile.email}
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          ID: {profile.id} · Joined {new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <ProfileSection profile={profile} onSaved={load} />
      <SubscriptionSection sub={subscription} userId={profile.id} onSaved={load} />
      <ScoresSection initialScores={scores} userId={profile.id} />

      {/* Charity */}
      <SectionCard title="Charity Selection">
        {charity ? (
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">{charity.charities?.name ?? '—'}</p>
              <p className="text-xs text-gray-400">{charity.contribution_percentage}% of subscription</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No charity selected.</p>
        )}
      </SectionCard>

      {/* Wins */}
      <SectionCard title={`Win History (${winners.length})`}>
        {winners.length === 0 ? (
          <p className="text-sm text-gray-400">No wins yet.</p>
        ) : (
          <div className="space-y-2">
            {winners.map((w) => {
              const ds = deriveDisplayStatus(w.payment_status, w.verified_at)
              const { bg, text } = getStatusColors(ds)
              return (
                <div key={w.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{formatMatchType(w.match_type)}</p>
                    <p className="text-xs text-gray-400">{w.draws?.month ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">₹{Number(w.prize_amount).toLocaleString('en-IN')}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${bg} ${text}`}>{ds}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      <DangerZone userId={profile.id} />
    </div>
  )
}

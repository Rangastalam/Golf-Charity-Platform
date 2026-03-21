/**
 * @fileoverview Admin charity edit page — client component.
 *
 * Edit charity details, toggle active/featured, manage events.
 */

'use client'

import { use, useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminCharityEditPage({ params }) {
  const { id }    = use(params)
  const router    = useRouter()

  const [form, setForm] = useState({
    name:               '',
    description:        '',
    logo_url:           '',
    website_url:        '',
    registration_number: '',
    is_active:          true,
    is_featured:        false,
  })
  const [events,      setEvents]      = useState([])
  const [newEvent,    setNewEvent]    = useState({ title: '', date: '', description: '' })
  const [loadingPage, setLoadingPage] = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [addingEvt,   setAddingEvt]   = useState(false)
  const [deletingEvt, setDeletingEvt] = useState(null)
  const [error,       setError]       = useState(null)
  const [saved,       setSaved]       = useState(false)

  // ─── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/admin/charities/${id}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Failed to load')
        const c = json.charity
        setForm({
          name:                c.name               ?? '',
          description:         c.description        ?? '',
          logo_url:            c.logo_url           ?? '',
          website_url:         c.website_url        ?? '',
          registration_number: c.registration_number ?? '',
          is_active:           c.is_active  ?? true,
          is_featured:         c.is_featured ?? false,
        })
        setEvents(json.events ?? [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoadingPage(false)
      }
    }
    load()
  }, [id])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ─── Save charity ─────────────────────────────────────────────────────────

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res  = await fetch(`/api/admin/charities/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  async function addEvent() {
    if (!newEvent.title.trim() || !newEvent.date) { setError('Event title and date are required.'); return }
    setAddingEvt(true)
    setError(null)
    try {
      const res  = await fetch(`/api/admin/charities/${id}/events`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(newEvent),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to add event')
      setEvents((prev) => [...prev, json.event])
      setNewEvent({ title: '', date: '', description: '' })
    } catch (e) {
      setError(e.message)
    } finally {
      setAddingEvt(false)
    }
  }

  async function deleteEvent(evtId) {
    setDeletingEvt(evtId)
    try {
      const res  = await fetch(`/api/admin/charities/${id}/events/${evtId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to delete event')
      setEvents((prev) => prev.filter((e) => e.id !== evtId))
    } catch (e) {
      setError(e.message)
    } finally {
      setDeletingEvt(null)
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loadingPage) {
    return (
      <div className="max-w-2xl space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-gray-100 rounded-xl" />
        <div className="h-80 bg-gray-100 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/charities" className="text-xs font-semibold text-gray-400 hover:text-gray-600 mb-1 inline-block">
          ← Charities
        </Link>
        <h1 className="text-xl md:text-2xl font-black text-gray-900">{form.name || 'Edit Charity'}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">Changes saved.</div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Logo URL */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Logo URL</label>
          <input
            type="url"
            value={form.logo_url}
            onChange={(e) => set('logo_url', e.target.value)}
            placeholder="https://…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
          />
          {form.logo_url && (
            <Image src={form.logo_url} alt="Preview" width={64} height={64} unoptimized className="mt-2 w-16 h-16 rounded-xl object-cover border border-gray-100" />
          )}
        </div>

        {/* Website */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Website URL</label>
          <input
            type="url"
            value={form.website_url}
            onChange={(e) => set('website_url', e.target.value)}
            placeholder="https://…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
          />
        </div>

        {/* Registration number */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Registration Number</label>
          <input
            type="text"
            value={form.registration_number}
            onChange={(e) => set('registration_number', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
          />
        </div>

        {/* Toggles */}
        <div className="flex flex-col sm:flex-row gap-4">
          {[
            { field: 'is_active',   label: 'Active',   hint: 'Visible and selectable by members' },
            { field: 'is_featured', label: 'Featured', hint: 'Shown prominently on charity page'  },
          ].map(({ field, label, hint }) => (
            <label key={field} className="flex items-start gap-3 cursor-pointer flex-1">
              <button
                type="button"
                onClick={() => set(field, !form[field])}
                className={[
                  'relative w-9 h-5 rounded-full transition-colors duration-200 mt-0.5 flex-shrink-0',
                  form[field] ? 'bg-red-800' : 'bg-gray-200',
                ].join(' ')}
              >
                <span className={[
                  'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                  form[field] ? 'translate-x-4' : 'translate-x-0',
                ].join(' ')} />
              </button>
              <div>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{hint}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 sm:flex-none bg-red-800 text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-red-900 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link
            href="/admin/charities"
            className="flex-1 sm:flex-none text-center border border-gray-200 text-gray-700 text-sm font-semibold px-6 py-3 rounded-xl hover:border-gray-400 transition-colors min-h-[44px] flex items-center justify-center"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Events */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Events</h2>

        {/* Existing events */}
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">No events yet.</p>
        ) : (
          <div className="space-y-2">
            {events.map((evt) => (
              <div key={evt.id} className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{evt.title}</p>
                  <p className="text-xs text-gray-400">
                    {evt.date ? new Date(evt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                  {evt.description && <p className="text-xs text-gray-500 mt-0.5">{evt.description}</p>}
                </div>
                <button
                  onClick={() => deleteEvent(evt.id)}
                  disabled={deletingEvt === evt.id}
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors flex-shrink-0 disabled:opacity-50 min-h-[36px] px-2"
                >
                  {deletingEvt === evt.id ? '…' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add event */}
        <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500">Add Event</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Event title *"
              value={newEvent.title}
              onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px]"
            />
            <input
              type="date"
              value={newEvent.date}
              onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px]"
            />
          </div>
          <input
            type="text"
            placeholder="Description (optional)"
            value={newEvent.description}
            onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px]"
          />
          <button
            type="button"
            onClick={addEvent}
            disabled={addingEvt}
            className="w-full sm:w-auto bg-gray-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            {addingEvt ? 'Adding…' : '+ Add Event'}
          </button>
        </div>
      </section>
    </div>
  )
}

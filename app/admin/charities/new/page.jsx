/**
 * @fileoverview Admin new charity creation page — client component.
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/shared/Toast'

export default function AdminNewCharityPage() {
  const router = useRouter()
  const toast  = useToast()

  const [form, setForm] = useState({
    name:               '',
    description:        '',
    logo_url:           '',
    website_url:        '',
    registration_number: '',
    is_active:          true,
    is_featured:        false,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/charities', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create charity')
      toast.success('Charity created!')
      router.push('/admin/charities')
    } catch (e) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/charities" className="text-xs font-semibold text-gray-400 hover:text-gray-600 mb-1 inline-block">
          ← Charities
        </Link>
        <h1 className="text-xl md:text-2xl font-black text-gray-900">Add Charity</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Charity name"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Brief description of the charity…"
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
            placeholder="Official charity reg. number"
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
            disabled={loading}
            className="flex-1 sm:flex-none bg-red-800 text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-red-900 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            {loading ? 'Creating…' : 'Create Charity'}
          </button>
          <Link
            href="/admin/charities"
            className="flex-1 sm:flex-none text-center border border-gray-200 text-gray-700 text-sm font-semibold px-6 py-3 rounded-xl hover:border-gray-400 transition-colors min-h-[44px] flex items-center justify-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

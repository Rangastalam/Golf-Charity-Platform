/**
 * @fileoverview Admin reports and analytics page — client component.
 *
 * Period filter: current_month / last_month / last_3_months / all_time.
 * Metrics: revenue, charity, prize, subscribers, new subscribers.
 * Bar chart: subscriber growth (last 6 months).
 * Pie chart: charity distribution.
 * CSV export of summary.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'current_month',  label: 'This Month'     },
  { value: 'last_month',     label: 'Last Month'     },
  { value: 'last_3_months',  label: 'Last 3 Months'  },
  { value: 'all_time',       label: 'All Time'       },
]

const PIE_COLORS = ['#7c3aed', '#db2777', '#d97706', '#059669', '#2563eb', '#dc2626']

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(metrics, period) {
  const rows = [
    ['Metric',                  'Value'],
    ['Period',                   period],
    ['Total Revenue (₹)',        metrics.totalRevenue        ?? 0],
    ['Charity Contributions (₹)', metrics.totalCharity       ?? 0],
    ['Prize Payouts (₹)',         metrics.totalPrize          ?? 0],
    ['Active Subscribers',        metrics.activeSubscribers   ?? 0],
    ['New Subscribers',           metrics.newSubscribers      ?? 0],
    ['Draws Completed',           metrics.drawsCompleted      ?? 0],
  ]
  const csv  = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `golfgives-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ title, value, accent }) {
  return (
    <div className={`${accent} rounded-2xl p-4 md:p-5`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{title}</p>
      <p className="text-2xl md:text-3xl font-black mt-1 leading-none">{value}</p>
    </div>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-800">{label}</p>
      <p className="text-gray-600">{payload[0]?.value} subscribers</p>
    </div>
  )
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-800">{payload[0]?.name}</p>
      <p className="text-gray-600">₹{Number(payload[0]?.value).toLocaleString('en-IN')}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const [period,              setPeriod]              = useState('current_month')
  const [metrics,             setMetrics]             = useState(null)
  const [subscriberGrowth,    setSubscriberGrowth]    = useState([])
  const [charityDistribution, setCharityDistribution] = useState([])
  const [loading,             setLoading]             = useState(true)
  const [error,               setError]               = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ period })
      const res    = await fetch(`/api/admin/reports?${params}`)
      const json   = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load reports')
      setMetrics(json.metrics ?? {})
      setSubscriberGrowth(json.subscriberGrowth ?? [])
      setCharityDistribution(json.charityDistribution ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900">Reports & Analytics</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Platform performance at a glance.</p>
        </div>
        {metrics && (
          <button
            onClick={() => exportCSV(metrics, period)}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:border-gray-400 transition-colors min-h-[44px]"
          >
            ↓ Export CSV
          </button>
        )}
      </div>

      {/* Period filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={[
              'flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors min-h-[32px]',
              period === p.value ? 'bg-red-900 text-white border-red-900' : 'border-gray-200 text-gray-600 hover:border-gray-400',
            ].join(' ')}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded-2xl" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      )}

      {!loading && metrics && (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <MetricCard
              title="Total Revenue"
              value={`₹${Number(metrics.totalRevenue ?? 0).toLocaleString('en-IN')}`}
              accent="bg-blue-50 text-blue-900"
            />
            <MetricCard
              title="Charity Contributions"
              value={`₹${Number(metrics.totalCharity ?? 0).toLocaleString('en-IN')}`}
              accent="bg-pink-50 text-pink-900"
            />
            <MetricCard
              title="Prize Payouts"
              value={`₹${Number(metrics.totalPrize ?? 0).toLocaleString('en-IN')}`}
              accent="bg-purple-50 text-purple-900"
            />
            <MetricCard
              title="Active Subscribers"
              value={(metrics.activeSubscribers ?? 0).toLocaleString()}
              accent="bg-green-50 text-green-900"
            />
            <MetricCard
              title="New Subscribers"
              value={(metrics.newSubscribers ?? 0).toLocaleString()}
              accent="bg-amber-50 text-amber-900"
            />
            <MetricCard
              title="Draws Completed"
              value={(metrics.drawsCompleted ?? 0).toLocaleString()}
              accent="bg-gray-50 text-gray-900"
            />
          </div>

          {/* Subscriber growth chart */}
          {subscriberGrowth.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Subscriber Growth (Last 6 Months)</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={subscriberGrowth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" fill="#7f1d1d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* Charity distribution chart */}
          {charityDistribution.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Charity Distribution</h2>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={charityDistribution}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                    >
                      {charityDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-gray-700">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Table */}
                <div className="w-full md:w-auto md:min-w-[200px] overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2 pr-4">Charity</th>
                        <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {charityDistribution.map((c, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-4 text-gray-800 truncate max-w-[140px]">
                            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            {c.name}
                          </td>
                          <td className="py-2 text-right font-semibold text-gray-700">
                            ₹{Number(c.amount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

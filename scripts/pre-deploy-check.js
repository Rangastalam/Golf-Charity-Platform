#!/usr/bin/env node
/**
 * @fileoverview Pre-deployment checklist.
 *
 * Run with:  node scripts/pre-deploy-check.js
 *
 * Reads .env.local automatically if present.
 * All checks are independent — a failure in one does not skip others.
 */

'use strict'

const fs   = require('fs')
const path = require('path')

// ─── Load .env.local ──────────────────────────────────────────────────────────

const envPath = path.resolve(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key   = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !process.env[key]) process.env[key] = value
  }
}

// ─── Output helpers ───────────────────────────────────────────────────────────

let exitCode = 0

function pass(label)         { console.log(`✅  ${label}`) }
function fail(label)         { console.log(`❌  ${label}`); exitCode = 1 }
function warn(label)         { console.log(`⚠️   ${label}`) }
function section(title)      { console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`) }

// ─── Required environment variables ──────────────────────────────────────────

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_MONTHLY_PRICE_ID',
  'STRIPE_YEARLY_PRICE_ID',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'NEXT_PUBLIC_APP_URL',
]

const PLACEHOLDER_PATTERNS = ['your_', 'xxx', 'placeholder', 'changeme', 'todo', '<']

section('Environment Variables')

for (const key of REQUIRED_VARS) {
  const val = process.env[key]
  if (!val) {
    fail(`Missing env var: ${key}`)
    continue
  }
  const isPlaceholder = PLACEHOLDER_PATTERNS.some((p) =>
    val.toLowerCase().includes(p)
  )
  if (isPlaceholder) {
    fail(`Placeholder value detected: ${key} = "${val.slice(0, 40)}…"`)
  } else {
    pass(`${key}: set`)
  }
}

// ─── Supabase checks ──────────────────────────────────────────────────────────

const REQUIRED_TABLES = [
  'profiles', 'subscriptions', 'scores', 'charities',
  'charity_events', 'charity_contributions', 'user_charity_selections',
  'draws', 'draw_entries', 'winners', 'prize_pools',
]

async function checkSupabase() {
  section('Supabase')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    fail('Supabase connection: skipped (missing URL or service role key)')
    return
  }

  // ── Connection check ─────────────────────────────────────────────────────
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey:        key,
        Authorization: `Bearer ${key}`,
      },
    })
    if (res.ok || res.status === 400) {
      pass('Supabase connection: OK')
    } else {
      fail(`Supabase connection: HTTP ${res.status}`)
      return
    }
  } catch (err) {
    fail(`Supabase connection: ${err.message}`)
    return
  }

  // ── Table existence checks ────────────────────────────────────────────────
  for (const table of REQUIRED_TABLES) {
    try {
      const res = await fetch(
        `${url}/rest/v1/${table}?limit=0`,
        {
          headers: {
            apikey:        key,
            Authorization: `Bearer ${key}`,
            'Range-Unit':  'items',
            Range:         '0-0',
          },
        }
      )
      if (res.status === 200 || res.status === 206 || res.status === 416) {
        pass(`Table exists: ${table}`)
      } else if (res.status === 404 || res.status === 400) {
        const body = await res.json().catch(() => ({}))
        if (String(body?.message ?? '').includes('does not exist') ||
            String(body?.code ?? '') === '42P01') {
          fail(`Table missing: ${table}`)
        } else {
          pass(`Table exists: ${table}`)
        }
      } else {
        warn(`Table check inconclusive: ${table} (HTTP ${res.status})`)
      }
    } catch (err) {
      fail(`Table check failed: ${table} — ${err.message}`)
    }
  }

  // ── Charity population check ──────────────────────────────────────────────
  try {
    const res  = await fetch(`${url}/rest/v1/charities?select=count`, {
      headers: {
        apikey:        key,
        Authorization: `Bearer ${key}`,
        Prefer:        'count=exact',
        Range:         '0-0',
      },
    })
    const count = parseInt(res.headers.get('content-range')?.split('/')[1] ?? '0', 10)
    if (count === 0) {
      warn('No charities in database — run: node scripts/seed-production.js')
    } else {
      pass(`Charities in database: ${count}`)
    }
  } catch {
    warn('Could not count charities')
  }

  // ── Storage bucket check ──────────────────────────────────────────────────
  try {
    const res  = await fetch(`${url}/storage/v1/bucket/winner-proofs`, {
      headers: {
        apikey:        key,
        Authorization: `Bearer ${key}`,
      },
    })
    if (res.ok) {
      pass('Storage bucket exists: winner-proofs')
    } else {
      fail('Storage bucket missing: winner-proofs — create it in Supabase Dashboard → Storage')
    }
  } catch (err) {
    fail(`Storage bucket check failed: ${err.message}`)
  }
}

// ─── Stripe checks ────────────────────────────────────────────────────────────

async function checkStripe() {
  section('Stripe')

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    fail('Stripe connection: skipped (missing STRIPE_SECRET_KEY)')
    return
  }

  // ── Connection check ─────────────────────────────────────────────────────
  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (res.ok) {
      pass('Stripe connection: OK')
    } else {
      const body = await res.json().catch(() => ({}))
      fail(`Stripe connection: ${body?.error?.message ?? `HTTP ${res.status}`}`)
      return
    }
  } catch (err) {
    fail(`Stripe connection: ${err.message}`)
    return
  }

  // ── Price ID validation ───────────────────────────────────────────────────
  for (const [label, envKey] of [
    ['Monthly price', 'STRIPE_MONTHLY_PRICE_ID'],
    ['Yearly price',  'STRIPE_YEARLY_PRICE_ID'],
  ]) {
    const priceId = process.env[envKey]
    if (!priceId) { fail(`${label}: ${envKey} not set`); continue }

    try {
      const res  = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      const body = await res.json()
      if (res.ok && body.active) {
        pass(`${label} valid: ${priceId}`)
      } else if (res.ok && !body.active) {
        warn(`${label} exists but is INACTIVE: ${priceId}`)
      } else {
        fail(`${label} not found: ${priceId} — ${body?.error?.message ?? ''}`)
      }
    } catch (err) {
      fail(`${label} check failed: ${err.message}`)
    }
  }

  // ── Webhook endpoint check ────────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  try {
    const res  = await fetch('https://api.stripe.com/v1/webhook_endpoints?limit=10', {
      headers: { Authorization: `Bearer ${key}` },
    })
    const body = await res.json()
    const endpoints = body?.data ?? []
    const ourEndpoint = endpoints.find((e) =>
      appUrl && e.url?.startsWith(appUrl)
    )
    if (ourEndpoint) {
      pass(`Stripe webhook endpoint exists: ${ourEndpoint.url}`)
    } else if (endpoints.length > 0) {
      warn(`No webhook endpoint matching ${appUrl}/api/webhooks/stripe — create one in Stripe Dashboard`)
    } else {
      warn('No Stripe webhook endpoints configured — create one pointing to /api/webhooks/stripe')
    }
  } catch (err) {
    warn(`Webhook endpoint check failed: ${err.message}`)
  }
}

// ─── Build check ─────────────────────────────────────────────────────────────

async function checkBuild() {
  section('Build')

  const { execSync } = require('child_process')
  const rootDir = path.resolve(__dirname, '..')

  try {
    console.log('   Running next build (this may take 60–120 seconds)…')
    execSync('npx next build', {
      cwd:   rootDir,
      stdio: 'pipe',
      env:   { ...process.env, NODE_ENV: 'production' },
    })
    pass('next build: succeeded')
  } catch (err) {
    const output = (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? '')
    fail(`next build: FAILED\n${output.slice(-2000)}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

;(async () => {
  console.log('\n🏌️  GolfGives Pre-Deployment Check')
  console.log('═'.repeat(56))

  await checkSupabase()
  await checkStripe()

  const args = process.argv.slice(2)
  if (args.includes('--build')) {
    await checkBuild()
  } else {
    section('Build')
    warn('Build check skipped — run with --build flag to include it')
  }

  console.log('\n' + '═'.repeat(56))
  if (exitCode === 0) {
    console.log('✅  All checks passed — ready to deploy!\n')
  } else {
    console.log('❌  Some checks failed — fix the issues above before deploying.\n')
  }

  process.exit(exitCode)
})()

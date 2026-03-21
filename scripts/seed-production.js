#!/usr/bin/env node
/**
 * @fileoverview Production data seeding script.
 *
 * Run once after first deployment:
 *   node scripts/seed-production.js
 *
 * Seeds:
 *   - 3 featured charities
 *   - Sample charity events for each charity
 *   - Prompts to create an admin user
 *
 * Idempotent — checks for existing data before inserting.
 * Does NOT insert fake users or fake subscriptions.
 */

'use strict'

const fs       = require('fs')
const path     = require('path')
const readline = require('readline')

// ─── Load .env.local ──────────────────────────────────────────────────────────

const envPath = path.resolve(__dirname, '..', '.env.local')
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

// ─── Validate env ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// ─── Supabase REST helpers ────────────────────────────────────────────────────

const HEADERS = {
  apikey:          SERVICE_KEY,
  Authorization:   `Bearer ${SERVICE_KEY}`,
  'Content-Type':  'application/json',
  Prefer:          'return=representation',
}

/**
 * @param {string} table
 * @param {string} [query='']
 */
async function select(table, query = '') {
  const res  = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`SELECT ${table}: HTTP ${res.status} — ${await res.text()}`)
  return res.json()
}

/**
 * @param {string} table
 * @param {object|object[]} data
 */
async function insert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: HEADERS,
    body:    JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`INSERT ${table}: HTTP ${res.status} — ${await res.text()}`)
  return res.json()
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const CHARITIES = [
  {
    name:                'Green Fairways Foundation',
    description:         'Dedicated to restoring natural habitats on and around golf courses across India. Every subscription contributes to planting native trees and protecting local wildlife corridors.',
    website_url:         'https://greenfairways.org',
    registration_number: 'GFF-2019-001234',
    is_active:           true,
    is_featured:         true,
  },
  {
    name:                'Junior Golf India',
    description:         'Providing underprivileged children with access to golf coaching, equipment, and tournament pathways. Over 2,000 children coached since 2017 across 14 states.',
    website_url:         'https://juniorgolfindia.org',
    registration_number: 'JGI-2017-005678',
    is_active:           true,
    is_featured:         true,
  },
  {
    name:                'Caddies Care Trust',
    description:         'Supporting golf course caddies and ground staff with healthcare access, children\'s education bursaries, and emergency financial assistance.',
    website_url:         'https://caddiestrust.org',
    registration_number: 'CCT-2020-009012',
    is_active:           true,
    is_featured:         true,
  },
]

const EVENTS_BY_CHARITY = {
  'Green Fairways Foundation': [
    {
      title:       'Annual Fairway Tree Planting Drive',
      description: 'Join us for our annual tree planting day. Members can volunteer or sponsor a tree in their name.',
      event_date:  '2026-04-22',
      location:    'DLF Golf & Country Club, Gurugram',
      is_public:   true,
    },
    {
      title:       'Wildlife Habitat Restoration Seminar',
      description: 'Expert-led seminar on integrating biodiversity corridors into golf course design.',
      event_date:  '2026-06-10',
      location:    'Online (Zoom)',
      is_public:   true,
    },
  ],
  'Junior Golf India': [
    {
      title:       'Junior Open Championship — Delhi Region',
      description: 'Annual junior tournament open to all JGI scholars. Prize money fully funded by member subscriptions.',
      event_date:  '2026-05-15',
      location:    'Classic Golf & Country Club, Manesar',
      is_public:   true,
    },
    {
      title:       'Equipment Drive 2026',
      description: 'Donate used golf equipment to be refurbished and distributed to junior golfers in underserved areas.',
      event_date:  '2026-03-30',
      location:    'Multiple drop-off points across India',
      is_public:   true,
    },
  ],
  'Caddies Care Trust': [
    {
      title:       'Annual Caddie Appreciation Day',
      description: 'A day dedicated to celebrating the contribution of caddies. Includes a charity scramble with members.',
      event_date:  '2026-05-01',
      location:    'Royal Calcutta Golf Club, Kolkata',
      is_public:   true,
    },
  ],
}

// ─── Prompt helper ────────────────────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

// ─── Seed functions ───────────────────────────────────────────────────────────

async function seedCharities() {
  console.log('\n── Charities ──────────────────────────────────────────')

  const existing = await select('charities', '?select=name')
  const existingNames = new Set(existing.map((c) => c.name))

  let inserted = 0
  for (const charity of CHARITIES) {
    if (existingNames.has(charity.name)) {
      console.log(`   ⏭  Skipped (already exists): ${charity.name}`)
      continue
    }
    await insert('charities', charity)
    console.log(`   ✅  Inserted: ${charity.name}`)
    inserted++
  }

  if (inserted === 0) {
    console.log('   ℹ️   All charities already exist.')
  }

  return await select('charities', '?select=id,name&is_active=eq.true')
}

async function seedEvents(charities) {
  console.log('\n── Charity Events ─────────────────────────────────────')

  const existing = await select('charity_events', '?select=title')
  const existingTitles = new Set(existing.map((e) => e.title))

  let inserted = 0
  for (const charity of charities) {
    const events = EVENTS_BY_CHARITY[charity.name]
    if (!events) continue

    for (const event of events) {
      if (existingTitles.has(event.title)) {
        console.log(`   ⏭  Skipped: ${event.title}`)
        continue
      }
      await insert('charity_events', { ...event, charity_id: charity.id })
      console.log(`   ✅  Inserted: ${event.title}`)
      inserted++
    }
  }

  if (inserted === 0) {
    console.log('   ℹ️   All events already exist.')
  }
}

async function seedAdminUser() {
  console.log('\n── Admin User ─────────────────────────────────────────')

  const email = await prompt('   Enter admin email address (or press Enter to skip): ')
  if (!email) {
    console.log('   ⏭  Skipped admin user creation.')
    return
  }

  // Check if profile already has admin role
  try {
    const existing = await select(
      'profiles',
      `?email=eq.${encodeURIComponent(email)}&select=id,is_admin`
    )

    if (existing.length > 0) {
      if (existing[0].is_admin) {
        console.log(`   ⏭  ${email} is already an admin.`)
        return
      }
      // Grant admin on existing profile
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${existing[0].id}`,
        {
          method:  'PATCH',
          headers: HEADERS,
          body:    JSON.stringify({ is_admin: true }),
        }
      )
      if (!res.ok) throw new Error(`PATCH profiles: HTTP ${res.status}`)
      console.log(`   ✅  Granted admin role to existing user: ${email}`)
      return
    }
  } catch (err) {
    console.log(`   ⚠️   Could not check existing profile: ${err.message}`)
  }

  // Create the user via Supabase Admin API
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method:  'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        email,
        email_confirm:  true,
        user_metadata:  { role: 'admin', full_name: 'Admin' },
        app_metadata:   { role: 'admin' },
      }),
    })
    const body = await res.json()
    if (!res.ok) {
      if (String(body?.msg ?? '').includes('already registered')) {
        console.log(`   ⚠️   User already exists in Auth. Update is_admin in profiles table manually.`)
      } else {
        throw new Error(body?.msg ?? `HTTP ${res.status}`)
      }
      return
    }
    console.log(`   ✅  Admin user created: ${email}`)
    console.log(`   ℹ️   A password reset email will be sent to ${email}.`)
    console.log(`   ℹ️   The user profile will be auto-created on first login via the DB trigger.`)
  } catch (err) {
    console.log(`   ❌  Failed to create admin user: ${err.message}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

;(async () => {
  console.log('\n🌱  GolfGives Production Seed Script')
  console.log('═'.repeat(56))
  console.log(`   Supabase: ${SUPABASE_URL}`)

  try {
    const charities = await seedCharities()
    await seedEvents(charities)
    await seedAdminUser()

    console.log('\n' + '═'.repeat(56))
    console.log('✅  Seeding complete!\n')
  } catch (err) {
    console.error('\n❌  Seed failed:', err.message)
    process.exit(1)
  }
})()

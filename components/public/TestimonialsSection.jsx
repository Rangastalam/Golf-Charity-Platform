/**
 * @fileoverview Testimonials — static cards.
 * Grid on desktop, horizontal scroll carousel on mobile.
 */

'use client'

import { motion } from 'framer-motion'

const TESTIMONIALS = [
  {
    name:    'Rajesh Menon',
    handle:  '@rajesh_m',
    charity: 'Child Education Fund',
    quote:   "I've played golf for 20 years and never felt like it meant something beyond the sport. GolfGives changed that — knowing every round goes toward educating kids makes me want to play more.",
    avatar:  'RM',
    color:   'bg-amber-900',
  },
  {
    name:    'Priya Sharma',
    handle:  '@priyag_plays',
    charity: 'Clean Water Initiative',
    quote:   "The prize draw is genuinely exciting — I won the 3-match prize last month! But honestly, even if I hadn't, the charity contribution alone would keep me subscribed.",
    avatar:  'PS',
    color:   'bg-rose-900',
  },
  {
    name:    'Arjun Nair',
    handle:  '@arjun_nair',
    charity: 'Rural Health Access',
    quote:   "I love that the score tracking is simple. Log your Stableford, the app does the rest. Best monthly sub I have — beats Netflix for satisfaction.",
    avatar:  'AN',
    color:   'bg-emerald-900',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Member Stories</span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mt-2 text-white">
            Real people. Real impact.
          </h2>
        </div>

        {/* Mobile: horizontal scroll. Desktop: grid */}
        <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.12, type: 'spring', stiffness: 240, damping: 24 }}
              className="flex-shrink-0 w-[85vw] sm:w-[70vw] md:w-auto snap-start bg-gray-900/60 border border-gray-800/60 rounded-2xl p-6 flex flex-col gap-4"
            >
              {/* Quote */}
              <p className="text-sm md:text-base text-gray-300 leading-relaxed flex-1">
                "{t.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-800/60">
                <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-xs font-black text-white flex-shrink-0`}>
                  {t.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                  <p className="text-xs text-amber-400 truncate">Supporting: {t.charity}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

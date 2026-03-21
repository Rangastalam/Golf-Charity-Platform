/**
 * @fileoverview How It Works section — three steps with scroll fade-in.
 */

'use client'

import { motion } from 'framer-motion'

const STEPS = [
  {
    number: '01',
    icon:   '🎯',
    title:  'Subscribe',
    description: 'Choose a monthly or yearly plan starting from ₹999/month. 40% goes to charity, 40% fills the prize pool.',
    accent: 'text-amber-400',
  },
  {
    number: '02',
    icon:   '⛳',
    title:  'Enter Your Scores',
    description: 'Log your Stableford scores after each round. Your best 5 scores form your entry ticket for the monthly draw.',
    accent: 'text-rose-400',
  },
  {
    number: '03',
    icon:   '🏆',
    title:  'Win & Give',
    description: 'On the 28th, five numbers are drawn. Match 3, 4, or 5 to win cash prizes — while your charity gets funded every month regardless.',
    accent: 'text-emerald-400',
  },
]

export default function HowItWorksSection() {
  return (
    <section className="py-16 md:py-24 px-4 bg-gray-900/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Simple by design</span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mt-2 text-white">
            Three steps to impact
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.14, type: 'spring', stiffness: 240, damping: 24 }}
              className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-6 md:p-8 flex flex-col gap-4"
            >
              {/* Large step number */}
              <span className={`text-5xl md:text-6xl font-black leading-none ${step.accent} opacity-30`}>
                {step.number}
              </span>

              {/* Icon */}
              <span className="text-3xl">{step.icon}</span>

              {/* Title */}
              <h3 className="text-lg md:text-xl font-black text-white">{step.title}</h3>

              {/* Description */}
              <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

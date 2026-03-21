/**
 * @fileoverview Animated geometric background for the hero section.
 * Floating orbs and grid lines — no golf imagery.
 */

'use client'

import { motion } from 'framer-motion'

const ORBS = [
  { size: 600, x: '60%',  y: '10%',  color: 'bg-amber-400/5',  delay: 0    },
  { size: 400, x: '-5%',  y: '40%',  color: 'bg-rose-500/4',   delay: 1.5  },
  { size: 300, x: '80%',  y: '70%',  color: 'bg-amber-300/4',  delay: 3    },
  { size: 200, x: '20%',  y: '80%',  color: 'bg-rose-400/4',   delay: 2    },
]

export default function HeroParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Glowing orbs */}
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          animate={{
            y:      [0, -20, 0],
            scale:  [1, 1.06, 1],
            opacity:[0.6, 1, 0.6],
          }}
          transition={{
            duration:  8 + i * 2,
            delay:     orb.delay,
            repeat:    Infinity,
            ease:      'easeInOut',
          }}
          className={`absolute rounded-full blur-3xl ${orb.color}`}
          style={{
            width:  orb.size,
            height: orb.size,
            left:   orb.x,
            top:    orb.y,
          }}
        />
      ))}

      {/* Diagonal accent lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="100%" x2="100%" y2="0" stroke="white" strokeWidth="1" />
        <line x1="-20%" y1="100%" x2="80%" y2="0" stroke="white" strokeWidth="1" />
        <line x1="20%" y1="100%" x2="120%" y2="0" stroke="white" strokeWidth="1" />
      </svg>
    </div>
  )
}

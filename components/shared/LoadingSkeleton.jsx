/**
 * @fileoverview Reusable loading skeleton with pulse animation.
 *
 * @param {{
 *   width?: string,
 *   height?: string,
 *   rounded?: string,
 *   count?: number,
 *   className?: string,
 *   dark?: boolean
 * }} props
 */

export default function LoadingSkeleton({
  width    = 'w-full',
  height   = 'h-4',
  rounded  = 'rounded-lg',
  count    = 1,
  className = '',
  dark     = false,
}) {
  const base = dark ? 'bg-gray-700' : 'bg-gray-200'

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={[
            'animate-pulse',
            base,
            width,
            height,
            rounded,
            className,
          ].join(' ')}
          aria-hidden="true"
        />
      ))}
    </>
  )
}

/**
 * Pre-composed card-shaped skeleton block.
 *
 * @param {{ dark?: boolean }} props
 */
export function CardSkeleton({ dark = false }) {
  const base  = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
  const inner = dark ? 'bg-gray-700' : 'bg-gray-200'

  return (
    <div className={`${base} border rounded-2xl p-6 animate-pulse`} aria-hidden="true">
      <div className={`${inner} h-3 w-24 rounded mb-3`} />
      <div className={`${inner} h-8 w-16 rounded mb-4`} />
      <div className={`${inner} h-3 w-full rounded mb-2`} />
      <div className={`${inner} h-3 w-3/4 rounded`} />
    </div>
  )
}

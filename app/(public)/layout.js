/**
 * @fileoverview Layout for public marketing routes: /charities, /how-it-works
 * Shares the main site Navbar and Footer.
 */

import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/shared/Footer'

export const metadata = {
  title: {
    template: '%s | GolfGives',
    default: 'GolfGives',
  },
}

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

/**
 * @fileoverview Public "How It Works" page — server component wrapper.
 *
 * metadata lives here (server-only). All animated/client content is in HowItWorksContent.
 */

import HowItWorksContent from './HowItWorksContent'

export const metadata = {
  title: 'How It Works',
  description: 'Learn how GolfGives works: subscribe, track your golf scores, enter monthly prize draws, and support charity every month.',
}

export default function HowItWorksPage() {
  return <HowItWorksContent />
}

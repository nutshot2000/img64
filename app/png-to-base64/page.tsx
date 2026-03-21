import Home from '../page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Convert PNG to Base64 — Free & Instant Online Encoder',
  description: 'Easily convert PNG images to Base64 string formats. 100% private, works offline. Drag, drop, or paste to encode PNG to Data URI.',
}

export default function Page() {
  return <Home />
}

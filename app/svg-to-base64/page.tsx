import Home from '../page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Convert SVG to Base64 — Free & Instant Online Encoder',
  description: 'Easily convert SVG images to Base64 string formats. 100% private, works offline. Drag, drop, or paste to encode SVG to Data URI.',
}

export default function Page() {
  return <Home />
}

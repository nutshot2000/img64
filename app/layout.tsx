import type { Metadata } from 'next'
import { AuthProvider } from '@/components/AuthProvider'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://img64.dev'),
  title: 'Image to Base64 Converter — Free & Instant | No Upload',
  description: 'Convert images to Base64 instantly. Drag, drop, or paste. 100% private — no uploads, works offline. Free online Base64 image encoder with auto-compression.',
  keywords: 'image to base64, base64 encoder, image encoder, convert image to base64, base64 image, data uri, base64 converter, image to data uri, online base64 tool, base64 image converter, png to base64, jpg to base64, image to data url, base64 string generator, encode image to base64, base64 image optimizer, compress image to base64, image compression tool, online image encoder, free base64 converter, webp to base64, gif to base64, svg to base64, base64 generator, image to code, image encoder online, client-side image converter',
  authors: [{ name: 'Image to Base64' }],
  openGraph: {
    title: 'Image to Base64 Converter — Free & Instant',
    description: 'Convert images to Base64 instantly. 100% private, works offline. No uploads needed.',
    url: 'https://img64.dev',
    siteName: 'Image to Base64',
    images: [{
      url: 'https://img64.dev/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Image to Base64 Converter'
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Image to Base64 Converter — Free & Instant',
    description: 'Convert images to Base64 instantly. 100% private, works offline.',
    images: ['https://img64.dev/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Image to Base64 Converter',
      description: 'Convert images to Base64 instantly with auto-compression. 100% private, works offline. Free online Base64 image encoder.',
      url: 'https://img64.dev',
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        'Convert images to Base64',
        'Auto-compress images',
        'Drag and drop support',
        'Paste from clipboard',
        'Multiple output formats',
        'Works offline',
        'No server upload',
        'Data URI generator',
        'CSS background image encoder',
        'HTML img tag generator',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does it work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Base64 is an encoding algorithm that transforms any binary data, including images, into text format containing only readable ASCII characters. When you convert an image to Base64 (creating a Data URI), you can embed the image directly into HTML, CSS, or JSON without relying on external file requests.'
          }
        },
        {
          '@type': 'Question',
          name: 'Why convert images to Base64 strings?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'It reduces HTTP requests, enables offline availability, streamlines HTML emails, and works seamlessly with JSON APIs.'
          }
        },
        {
          '@type': 'Question',
          name: 'Is this image converter secure?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! Our Image to Base64 Converter operates completely locally within your web browser. No images are uploaded to any server, guaranteeing 100% privacy.'
          }
        }
      ]
    }
  ]

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="canonical" href="https://img64.dev" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-E4YJGDJFS7"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-E4YJGDJFS7');
            `,
          }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

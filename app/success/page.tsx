import Link from 'next/link'
import { Suspense } from 'react'

function SuccessContent() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-lg text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to Pro! 🎉</h1>
        <p className="text-slate-600 mb-6">
          Your subscription is active. You now have unlimited access to all Pro features.
        </p>
        
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Your Pro benefits:</h3>
          <ul className="text-left text-blue-800 space-y-1 text-sm">
            <li>✓ Unlimited conversions</li>
            <li>✓ Batch upload (50 files)</li>
            <li>✓ Premium compression</li>
            <li>✓ API access</li>
          </ul>
        </div>
        
        <Link
          href="/"
          className="block w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          Start Converting
        </Link>
      </div>
    </main>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}

import Link from 'next/link'

export default function Pricing() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Simple Pricing</h1>
          <p className="text-slate-600 text-lg">Start free. Upgrade when you need more.</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Free</h2>
            <p className="text-slate-500 mb-6">For occasional use</p>
            <div className="text-4xl font-bold text-slate-800 mb-6">£0</div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-slate-600">
                <span className="text-green-500">✓</span>
                10 conversions per day
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <span className="text-green-500">✓</span>
                Single file upload
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <span className="text-green-500">✓</span>
                All image formats
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <span className="text-green-500">✓</span>
                Basic compression
              </li>
            </ul>
            <Link 
              href="/"
              className="block w-full py-3 text-center rounded-lg border-2 border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Continue Free
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 shadow-lg text-white relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
              POPULAR
            </div>
            <h2 className="text-2xl font-bold mb-2">Pro</h2>
            <p className="text-blue-100 mb-6">For power users</p>
            <div className="text-4xl font-bold mb-6">£9<span className="text-lg text-blue-100">/month</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-yellow-300">✓</span>
                Unlimited conversions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-300">✓</span>
                Batch upload (50 files)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-300">✓</span>
                Premium compression (up to 100%)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-300">✓</span>
                API access
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-300">✓</span>
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-300">✓</span>
                No ads
              </li>
            </ul>
            <Link
              href="/api/checkout"
              className="block w-full py-3 text-center rounded-lg bg-white text-blue-600 font-bold hover:bg-blue-50 transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">FAQ</h2>
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-2">What happens when I hit the free limit?</h3>
              <p className="text-slate-600">You'll need to wait until tomorrow or upgrade to Pro for unlimited conversions.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-2">Can I cancel anytime?</h3>
              <p className="text-slate-600">Yes, cancel anytime. You'll keep Pro access until the end of your billing period.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-2">Is my data private?</h3>
              <p className="text-slate-600">Absolutely. All processing happens in your browser. We never see your images.</p>
            </div>
          </div>
        </div>

        {/* Back to app */}
        <div className="mt-12 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to converter
          </Link>
        </div>
      </div>
    </main>
  )
}

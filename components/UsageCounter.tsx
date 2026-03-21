import { useEffect, useState } from 'react'
import { getRemaining, hasReachedLimit, getLimit } from '@/lib/usage'
import Link from 'next/link'

export default function UsageCounter() {
  const [remaining, setRemaining] = useState(getRemaining())
  const [isLimited, setIsLimited] = useState(hasReachedLimit())
  const limit = getLimit()

  useEffect(() => {
    // Update every second to catch changes
    const interval = setInterval(() => {
      setRemaining(getRemaining())
      setIsLimited(hasReachedLimit())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (isLimited) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-red-800">Daily limit reached</p>
            <p className="text-sm text-red-600">You've used all {limit} free conversions today.</p>
          </div>
          <Link
            href="/pricing"
            className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-blue-800">Free tier: {remaining} of {limit} remaining today</p>
          <div className="w-48 h-2 bg-blue-200 rounded-full mt-2">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(remaining / limit) * 100}%` }}
            />
          </div>
        </div>
        <Link
          href="/pricing"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors text-sm"
        >
          Upgrade
        </Link>
      </div>
    </div>
  )
}

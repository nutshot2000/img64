'use client'

import { useState, useEffect } from 'react'
import { getUsage, getRemaining, FREE_DAILY_LIMIT } from '@/lib/usage'

interface UsageTrackerProps {
  isPro?: boolean
}

export function UsageTracker({ isPro = false }: UsageTrackerProps) {
  const [usage, setUsage] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const data = getUsage()
    setUsage(data.count)
  }, [])

  // Refresh usage every 5 seconds
  useEffect(() => {
    if (isPro) return
    
    const interval = setInterval(() => {
      const data = getUsage()
      setUsage(data.count)
    }, 5000)

    return () => clearInterval(interval)
  }, [isPro])

  if (!mounted) return null

  if (isPro) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Pro Member</span>
      </div>
    )
  }

  const remaining = getRemaining()
  const percentage = (usage / FREE_DAILY_LIMIT) * 100

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-400">
          Free tier: {usage} of {FREE_DAILY_LIMIT} conversions
        </span>
        <span className={`font-medium ${remaining === 0 ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
          {remaining} remaining
        </span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            percentage >= 100 ? 'bg-red-500' : percentage >= 75 ? 'bg-amber-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {remaining === 0 && (
        <p className="text-xs text-red-500 mt-1">
          Daily limit reached. Upgrade to Pro for unlimited conversions!
        </p>
      )}
    </div>
  )
}

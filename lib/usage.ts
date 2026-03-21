// Usage tracking for free tier
const USAGE_KEY = 'img64_usage'
const USAGE_DATE_KEY = 'img64_usage_date'
export const FREE_DAILY_LIMIT = 10

interface UsageData {
  count: number
  date: string
}

export function getUsage(): UsageData {
  if (typeof window === 'undefined') return { count: 0, date: new Date().toDateString() }
  
  const saved = localStorage.getItem(USAGE_KEY)
  const savedDate = localStorage.getItem(USAGE_DATE_KEY)
  const today = new Date().toDateString()
  
  // Reset if new day
  if (savedDate !== today) {
    localStorage.setItem(USAGE_DATE_KEY, today)
    localStorage.setItem(USAGE_KEY, '0')
    return { count: 0, date: today }
  }
  
  return { 
    count: saved ? parseInt(saved, 10) : 0, 
    date: today 
  }
}

export function incrementUsage(): number {
  if (typeof window === 'undefined') return 0
  
  const usage = getUsage()
  const newCount = usage.count + 1
  localStorage.setItem(USAGE_KEY, newCount.toString())
  return newCount
}

export function getRemaining(): number {
  const usage = getUsage()
  return Math.max(0, FREE_DAILY_LIMIT - usage.count)
}

export function hasReachedLimit(): boolean {
  const usage = getUsage()
  return usage.count >= FREE_DAILY_LIMIT
}

export function getLimit(): number {
  return FREE_DAILY_LIMIT
}

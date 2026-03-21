'use client'

interface ProBadgeProps {
  className?: string
}

export function ProBadge({ className = '' }: ProBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm ${className}`}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      PRO
    </span>
  )
}

interface ProFeatureProps {
  children: React.ReactNode
  isPro: boolean
  featureName: string
  onUpgradeClick: () => void
}

export function ProFeature({ children, isPro, featureName, onUpgradeClick }: ProFeatureProps) {
  if (isPro) {
    return <>{children}</>
  }

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-center p-4">
          <ProBadge className="mb-2" />
          <p className="text-white text-sm font-medium mb-2">{featureName}</p>
          <button
            onClick={onUpgradeClick}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors"
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    </div>
  )
}

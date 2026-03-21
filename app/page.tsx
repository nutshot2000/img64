'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import imageCompression from 'browser-image-compression'
import { UsageTracker } from '@/components/UsageTracker'
import { ProBadge, ProFeature } from '@/components/ProBadge'
import { getUsage, incrementUsage, hasReachedLimit, FREE_DAILY_LIMIT } from '@/lib/usage'

// Social share URLs
const shareTwitter = (url: string, text: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
const shareReddit = (url: string, title: string) => `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`

interface ImageResult {
  id: string
  dataUri: string
  base64: string
  fileName: string
  fileSize: number
  originalFileSize: number
  mimeType: string
  width: number
  height: number
  compressed: boolean
  timestamp: number
}

// localStorage key for history
const HISTORY_KEY = 'img64_history'
const MAX_HISTORY = 20

export default function Home() {
  const { data: session, status } = useSession()
  const [isDragging, setIsDragging] = useState(false)
  const [results, setResults] = useState<ImageResult[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copyFormat, setCopyFormat] = useState<'dataUri' | 'base64' | 'css' | 'img' | 'json'>('dataUri')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [compressImages, setCompressImages] = useState(true)
  const [compressionQuality, setCompressionQuality] = useState(80)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<ImageResult[]>([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [conversionCount, setConversionCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchFileInputRef = useRef<HTMLInputElement>(null)

  // Load conversion count from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const count = localStorage.getItem('img64_conversion_count')
      if (count) setConversionCount(parseInt(count, 10))
    }
  }, [])

  const isPro = session?.user?.isPro || false
  const isAuthenticated = status === 'authenticated'

  // Load history from localStorage
  const loadHistory = useCallback(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  }, [])

  // Save to history
  const saveToHistory = useCallback((result: ImageResult) => {
    if (typeof window === 'undefined') return
    try {
      const hist = loadHistory()
      const newHistory = [result, ...hist].slice(0, MAX_HISTORY)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
    } catch {
      // Ignore storage errors
    }
  }, [loadHistory])

  // Clear history
  const clearHistory = useCallback(() => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(HISTORY_KEY)
    showToastMessage('History cleared!')
  }, [])

  // Load history when panel opens
  useEffect(() => {
    if (showHistory) {
      setHistory(loadHistory())
    }
  }, [showHistory, loadHistory])

  // Check for dark mode preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setDarkMode(isDark)
    }
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const generateId = () => Math.random().toString(36).substring(2, 9)

  const compressFile = async (file: File): Promise<File> => {
    if (!compressImages) return file
    
    // Skip SVG and GIF (compression doesn't work well)
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file
    
    // Pro users get higher quality compression (90-100%)
    const quality = isPro ? Math.max(compressionQuality, 90) : compressionQuality
    
    const options = {
      maxSizeMB: isPro ? 5 : 1, // Pro users get larger file support
      maxWidthOrHeight: isPro ? 8192 : 4096, // Pro users get higher resolution
      useWebWorker: true,
      initialQuality: quality / 100,
    }
    
    try {
      const compressedFile = await imageCompression(file, options)
      return compressedFile
    } catch {
      return file
    }
  }

  const checkAndIncrementUsage = (fileCount: number): boolean => {
    if (isPro) return true
    
    const currentUsage = getUsage().count
    if (currentUsage + fileCount > FREE_DAILY_LIMIT) {
      setShowLimitModal(true)
      return false
    }
    
    // Increment usage for each file
    for (let i = 0; i < fileCount; i++) {
      incrementUsage()
    }
    return true
  }

  const processFiles = async (files: File[]) => {
    const fileArray = files.filter(f => f.type.startsWith('image/'))
    
    if (fileArray.length === 0) {
      showToastMessage('Please select image files')
      return
    }

    // Check usage limit
    if (!checkAndIncrementUsage(fileArray.length)) {
      return
    }

    for (const file of fileArray) {
      const originalSize = file.size
      const processedFile = await compressFile(file)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUri = e.target?.result as string
        const base64 = dataUri.split(',')[1]
        
        // Get image dimensions
        const img = new Image()
        img.onload = () => {
          const wasCompressed = processedFile.size < originalSize
          const newResult: ImageResult = {
            id: generateId(),
            dataUri,
            base64,
            fileName: file.name,
            fileSize: processedFile.size,
            originalFileSize: originalSize,
            mimeType: processedFile.type || file.type,
            width: img.width,
            height: img.height,
            compressed: wasCompressed,
            timestamp: Date.now(),
          }
          setResults(prev => [newResult, ...prev])
          setSelectedId(newResult.id)
          // Save to history
          saveToHistory(newResult)
          // Track conversion
          trackConversion(newResult)
          // Increment counter
          const newCount = conversionCount + 1
          setConversionCount(newCount)
          localStorage.setItem('img64_conversion_count', newCount.toString())
        }
        img.src = dataUri
      }
      reader.readAsDataURL(processedFile)
    }

    const savedMsg = compressImages ? ' (optimized)' : ''
    showToastMessage(`${fileArray.length} image${fileArray.length > 1 ? 's' : ''} converted${savedMsg}`)
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    await processFiles(fileArray)
  }, [compressImages, compressionQuality, isPro])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const handleBatchFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0) handleFiles(files)
  }, [handleFiles])

  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  const showToastMessage = (msg: string) => {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  // GA4 Event Tracking
  const trackEvent = useCallback((eventName: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, params)
    }
  }, [])

  // Track image dropped
  useEffect(() => {
    if (isDragging) {
      trackEvent('image_drag_start')
    }
  }, [isDragging, trackEvent])

  // Track conversions
  const trackConversion = useCallback((result: ImageResult) => {
    trackEvent('image_converted', {
      file_type: result.mimeType,
      file_size: result.fileSize,
      compressed: result.compressed,
      is_pro: isPro
    })
  }, [trackEvent, isPro])

  const getCopyText = (result: ImageResult): string => {
    switch (copyFormat) {
      case 'base64':
        return result.base64
      case 'css':
        return `background-image: url('${result.dataUri}');`
      case 'img':
        return `<img src="${result.dataUri}" alt="${result.fileName}" width="${result.width}" height="${result.height}" />`
      case 'json':
        return JSON.stringify({ 
          fileName: result.fileName, 
          mimeType: result.mimeType,
          width: result.width,
          height: result.height,
          base64: result.base64 
        }, null, 2)
      default:
        return result.dataUri
    }
  }

  const copyToClipboard = async (result: ImageResult) => {
    const text = getCopyText(result)
    await navigator.clipboard.writeText(text)
    const formatNames: Record<string, string> = {
      dataUri: 'Data URI',
      base64: 'Base64',
      css: 'CSS',
      img: 'HTML',
      json: 'JSON'
    }
    showToastMessage(`${formatNames[copyFormat]} copied!`)
  }

  const copyAll = async () => {
    const allData = results.map(r => ({
      fileName: r.fileName,
      dataUri: r.dataUri,
      base64: r.base64
    }))
    await navigator.clipboard.writeText(JSON.stringify(allData, null, 2))
    showToastMessage('All results copied as JSON!')
  }

  const removeResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const clearAll = () => {
    setResults([])
    setSelectedId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearAllWithHistory = () => {
    clearAll()
    clearHistory()
  }

  const selected = results.find(r => r.id === selectedId)

  const bgClass = darkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-slate-100'
  const cardClass = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const textClass = darkMode ? 'text-slate-100' : 'text-slate-800'
  const textMutedClass = darkMode ? 'text-slate-400' : 'text-slate-500'

  return (
    <main className={`min-h-screen ${bgClass} transition-colors duration-300`}>
      {/* Header */}
      <header className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className={`text-3xl font-bold ${textClass}`}>Image to Base64</h1>
                {isPro && <ProBadge />}
              </div>
              <p className={textMutedClass}>Instant, private conversion. Drag, drop, paste, or click.</p>
              <p className={`text-xs ${textMutedClass} mt-1 flex items-center justify-center gap-2`}>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs font-mono">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs font-mono">V</kbd> to paste from clipboard
              </p>
            </div>
            
            {/* Auth Buttons */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <img 
                    src={session.user?.image || ''} 
                    alt={session.user?.name || ''} 
                    className="w-8 h-8 rounded-full"
                  />
                  <button
                    onClick={() => signOut()}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Sign in
                </button>
              )}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-blue-500 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                aria-label="Toggle history"
              >
                📜
              </button>
            </div>
          </div>
          
          {/* Usage Tracker */}
          <div className="mt-4 max-w-md mx-auto">
            <UsageTracker isPro={isPro} />
          </div>
        </div>
      </header>

      {/* History Sidebar */}
      {showHistory && (
        <div className={`fixed inset-y-0 right-0 w-80 ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-xl z-40 transform transition-transform duration-300 overflow-y-auto`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${textClass}`}>Conversion History</h2>
              <button
                onClick={() => setShowHistory(false)}
                className={`p-1 rounded ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              >
                ✕
              </button>
            </div>
            {(() => {
              if (history.length === 0) {
                return (
                  <p className={`text-sm ${textMutedClass} text-center py-8`}>
                    No conversion history yet.<br/>Your conversions will appear here.
                  </p>
                )
              }
              return (
                <>
                  <button
                    onClick={() => {
                      clearHistory()
                      setHistory([])
                    }}
                    className="text-sm text-red-500 hover:text-red-600 mb-4"
                  >
                    Clear History
                  </button>
                  <div className="space-y-2">
                    {history.map((item: ImageResult) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setResults(prev => {
                            if (prev.find(r => r.id === item.id)) return prev
                            return [item, ...prev]
                          })
                          setSelectedId(item.id)
                          setShowHistory(false)
                        }}
                        className={`p-2 rounded-lg cursor-pointer ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                      >
                        <div className="flex gap-2">
                          <img src={item.dataUri} alt={item.fileName} className="w-10 h-10 object-contain rounded" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${textClass}`}>{item.fileName}</p>
                            <p className={`text-xs ${textMutedClass}`}>{formatBytes(item.fileSize)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        {/* Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
            darkMode ? 'border-slate-600' : 'border-slate-300'
          } ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10 scale-[1.02] shadow-lg'
              : `hover:border-blue-400 ${darkMode ? 'hover:bg-blue-500/5' : 'hover:bg-blue-50/50'}`
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className={`transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}>
            <svg className={`w-20 h-20 mx-auto mb-4 ${isDragging ? 'text-blue-500' : darkMode ? 'text-slate-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className={`text-xl font-semibold ${textClass} mb-1`}>
            {isDragging ? 'Drop it!' : 'Drop images here'}
          </p>
          <p className={textMutedClass}>or click to browse • multiple files supported</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['PNG', 'JPG', 'GIF', 'WebP', 'SVG', 'BMP'].map(fmt => (
              <span key={fmt} className={`px-3 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                {fmt}
              </span>
            ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Batch Upload - Pro Feature */}
        <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
          {isPro ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ProBadge />
                <span className={textClass}>
                  <span className="font-medium">Batch Upload</span>
                  <span className={`block text-xs ${textMutedClass}`}>Upload multiple files at once</span>
                </span>
              </div>
              <button
                onClick={() => batchFileInputRef.current?.click()}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-colors"
              >
                Select Multiple Files
              </button>
              <input
                ref={batchFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleBatchFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between opacity-75">
              <div className="flex items-center gap-3">
                <ProBadge />
                <span className={textClass}>
                  <span className="font-medium">Batch Upload</span>
                  <span className={`block text-xs ${textMutedClass}`}>Upload multiple files at once</span>
                </span>
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg font-medium cursor-not-allowed"
              >
                Pro Only
              </button>
            </div>
          )}
        </div>

        {/* Compression Settings */}
        <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={compressImages}
                onChange={(e) => setCompressImages(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
              />
              <span className={textClass}>
                <span className="font-medium">Auto-compress</span>
                <span className={`block text-xs ${textMutedClass}`}>Reduce file size while converting</span>
              </span>
            </label>
            {compressImages && (
              <div className="flex items-center gap-3">
                <span className={`text-sm ${textMutedClass}`}>Quality:</span>
                <input
                  type="range"
                  min={isPro ? "90" : "50"}
                  max="100"
                  value={compressionQuality}
                  onChange={(e) => setCompressionQuality(Number(e.target.value))}
                  className="w-24 accent-blue-500"
                />
                <span className={`text-sm font-mono ${textClass} w-10`}>{compressionQuality}%</span>
                {!isPro && compressionQuality > 80 && (
                  <span className="text-xs text-amber-500">Pro: 90-100%</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-8 fade-in">
            {/* Conversion Counter */}
            {conversionCount > 0 && (
              <div className={`text-center py-2 mb-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <span className={`text-sm ${textMutedClass}`}>🎉 </span>
                <span className={`font-bold text-blue-500`}>{conversionCount.toLocaleString()}</span>
                <span className={`text-sm ${textMutedClass}`}> conversions on img64.dev</span>
              </div>
            )}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className={textMutedClass}>{results.length} result{results.length > 1 ? 's' : ''}</span>
                {results.length > 1 && (
                  <button
                    onClick={copyAll}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                  >
                    Copy All as JSON
                  </button>
                )}
              </div>
              <button
                onClick={clearAllWithHistory}
                className="px-3 py-1 text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
              >
                Clear All
              </button>
            </div>

            {/* Format Selector */}
            <div className={`flex flex-wrap gap-2 mb-4 p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <span className={textMutedClass}>Copy as:</span>
              {[
                { key: 'dataUri', label: 'Data URI' },
                { key: 'base64', label: 'Base64' },
                { key: 'css', label: 'CSS' },
                { key: 'img', label: 'HTML <img>' },
                { key: 'json', label: 'JSON' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCopyFormat(key as typeof copyFormat)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    copyFormat === key
                      ? 'bg-blue-500 text-white shadow-md'
                      : darkMode
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Results Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {results.map(result => (
                <div
                  key={result.id}
                  onClick={() => setSelectedId(result.id)}
                  className={`rounded-xl p-4 cursor-pointer transition-all ${
                    selectedId === result.id
                      ? 'ring-2 ring-blue-500 shadow-lg'
                      : ''
                  } ${cardClass}`}
                >
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <img src={result.dataUri} alt={result.fileName} className="w-full h-full object-contain" />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${textClass}`}>{result.fileName}</p>
                      <p className={`text-sm ${textMutedClass}`}>
                        {result.width} × {result.height} • {formatBytes(result.fileSize)}
                        {result.compressed && result.originalFileSize > result.fileSize && (
                          <span className="ml-2 text-green-500 font-medium">
                            ↓{Math.round((1 - result.fileSize / result.originalFileSize) * 100)}%
                          </span>
                        )}
                      </p>
                      <p className={`text-xs ${textMutedClass}`}>
                        {formatBytes(result.base64.length)} Base64
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(result) }}
                        className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                        title="Copy"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeResult(result.id) }}
                        className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-700 hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500'}`}
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview & Output for Selected */}
            {selected && (
              <div className={`mt-6 rounded-xl p-6 ${cardClass}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`font-semibold ${textClass}`}>Full Preview</h2>
                  <span className={`text-sm ${textMutedClass}`}>{selected.fileName}</span>
                </div>
                <div className={`flex justify-center rounded-lg p-4 mb-4 ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <img src={selected.dataUri} alt={selected.fileName} className="max-w-full max-h-80 rounded shadow-sm" />
                </div>
                <div className="relative">
                  <textarea
                    readOnly
                    value={getCopyText(selected)}
                    className={`w-full h-32 rounded-lg p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      darkMode ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                    } border`}
                  />
                  <button
                    onClick={() => copyToClipboard(selected)}
                    className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { icon: '🔒', title: '100% Private', desc: 'No uploads, all local' },
            { icon: '⚡', title: 'Instant', desc: 'Zero latency conversion' },
            { icon: '📱', title: 'Works Offline', desc: 'No server needed' },
            { icon: '🎯', title: 'Auto-Optimize', desc: 'Smart compression built-in' },
            { icon: '🎨', title: 'Multiple Formats', desc: 'Data URI, CSS, HTML, JSON' },
          ].map((f, i) => (
            <div key={i} className={`rounded-xl p-5 text-center ${cardClass}`}>
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className={`font-medium ${textClass}`}>{f.title}</h3>
              <p className={`text-sm ${textMutedClass}`}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* How to Use */}
        <div className={`mt-8 rounded-xl p-6 ${cardClass}`}>
          <h2 className={`font-semibold ${textClass} mb-4`}>Quick Guide</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Add Images', desc: 'Drag, click, or paste (Ctrl+V)' },
              { step: '2', title: 'Choose Format', desc: 'Data URI, Base64, CSS, HTML, or JSON' },
              { step: '3', title: 'Copy & Use', desc: 'Paste into your code or project' },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white bg-gradient-to-br from-blue-500 to-purple-600`}>
                  {item.step}
                </span>
                <div>
                  <p className={`font-medium ${textClass}`}>{item.title}</p>
                  <p className={`text-sm ${textMutedClass}`}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Use Cases */}
        <div className={`mt-8 rounded-xl p-6 ${cardClass}`}>
          <h2 className={`font-semibold ${textClass} mb-3`}>Common Use Cases</h2>
          <div className="flex flex-wrap gap-2">
            {[
              'Email signatures', 'Inline CSS images', 'API payloads', 'Data URIs for HTML',
              'Embedding icons', 'Small image storage', 'Prototyping', 'Icon fonts'
            ].map((use, i) => (
              <span key={i} className={`px-3 py-1 rounded-full text-sm ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {use}
              </span>
            ))}
          </div>
        </div>

        {/* Share Section */}
        <div className={`mt-8 rounded-xl p-6 text-center ${cardClass}`}>
          <h2 className={`font-semibold ${textClass} mb-3`}>Love this tool? Share it!</h2>
          <div className="flex justify-center gap-4">
            <a href={shareTwitter('https://img64.dev', 'Convert images to Base64 instantly & for free. No upload needed! 🚀')} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#1DA1F2] text-white rounded-lg font-medium hover:bg-opacity-90 transition-colors">Share on X</a>
            <a href={shareReddit('https://img64.dev', 'Free Image to Base64 Converter - Instant, Local & No Uploads')} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#FF4500] text-white rounded-lg font-medium hover:bg-opacity-90 transition-colors">Share on Reddit</a>
          </div>
        </div>

        {/* SEO Article / FAQ */}
        <article className={`mt-12 rounded-xl p-8 ${cardClass}`}>
          <h2 className={`text-2xl font-bold ${textClass} mb-6`}>What is Base64 Image Encoding?</h2>
          <div className={`space-y-6 flex flex-col ${textMutedClass} leading-relaxed`}>
            <section>
              <h3 className={`text-xl font-semibold ${textClass} mb-2`}>How does it work?</h3>
              <p>Base64 is an encoding algorithm that transforms any binary data, including images, into text format containing only readable ASCII characters. When you convert an image to Base64 (creating a Data URI), you can embed the image directly into HTML, CSS, or JSON without relying on external file requests.</p>
            </section>
            
            <section>
              <h3 className={`text-xl font-semibold ${textClass} mb-2`}>Why convert images to Base64 strings?</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Fewer HTTP Requests:</strong> Embedding images directly in your code removes the need to download separate image files, which can speed up page loading times for small icons and assets.</li>
                <li><strong>Offline Availability:</strong> If you embed images using Data URIs in your HTML or CSS, the assets don&apos;t require a network connection to display.</li>
                <li><strong>Streamlined Emails:</strong> HTML emails often block external images. Base64 encoding helps bypass this for lightweight elements like signatures and logos.</li>
                <li><strong>API Portability:</strong> Many REST APIs only accept JSON text. Encoding images to Base64 allows you to send images as simple JSON string payloads.</li>
              </ul>
            </section>
            
            <section>
              <h3 className={`text-xl font-semibold ${textClass} mb-2`}>Is this image converter secure?</h3>
              <p>Yes! Our <strong>Image to Base64 Converter</strong> operates completely locally within your web browser. When you drag and drop a file, it never leaves your device. No images are uploaded to any server, guaranteeing 100% privacy and lightning-fast instantaneous conversions.</p>
            </section>
          </div>
        </article>
      </div>

      {/* Footer */}
      <footer className={`py-8 text-center text-sm ${textMutedClass}`}>
        <p>Free & open source. No tracking, no ads, no BS.</p>
        
        {/* Support Button */}
        <div className="mt-3">
          <a
            href="https://ko-fi.com/nutshot2000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#29abe0] text-white rounded-lg hover:bg-[#1d8bbd] transition-colors font-medium"
          >
            ☕ Buy me a coffee
          </a>
        </div>
        
        <p className="mt-3">
          <a href="https://github.com/nutshot2000/-Image-to-Base64-Converter" target="_blank" rel="noopener" className="hover:text-blue-500 transition-colors">
            View on GitHub →
          </a>
        </p>
        <nav className="mt-4 flex flex-wrap justify-center gap-4">
          <a href="/about" className="hover:text-blue-500 transition-colors">About</a>
          <a href="/contact" className="hover:text-blue-500 transition-colors">Contact</a>
          <a href="/pricing" className="hover:text-blue-500 transition-colors font-semibold text-amber-500">Pricing</a>
          <a href="/privacy" className="hover:text-blue-500 transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-blue-500 transition-colors">Terms of Service</a>
        </nav>
        <p className="mt-4 text-xs opacity-75">© 2026 img64.dev. All rights reserved.</p>
      </footer>

      {/* Toast */}
      {showToast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 animate-bounce ${darkMode ? 'bg-slate-100 text-slate-800' : 'bg-slate-800 text-white'}`}>
          {toastMessage}
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}>
            <div className="text-center">
              <ProBadge className="mb-4 text-lg px-4 py-2" />
              <h2 className={`text-2xl font-bold ${textClass} mb-2`}>Upgrade to Pro</h2>
              <p className={`${textMutedClass} mb-6`}>
                Get unlimited conversions, batch uploads, high-quality compression, and more!
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                >
                  Maybe Later
                </button>
                <a
                  href="/pricing"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-colors"
                >
                  View Pricing
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Limit Reached Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}>
            <div className="text-center">
              <div className="text-4xl mb-4">⏰</div>
              <h2 className={`text-2xl font-bold ${textClass} mb-2`}>Daily Limit Reached</h2>
              <p className={`${textMutedClass} mb-2`}>
                You've used all {FREE_DAILY_LIMIT} free conversions for today.
              </p>
              <p className={`${textMutedClass} mb-6`}>
                Upgrade to Pro for unlimited conversions!
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowLimitModal(false)}
                  className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                >
                  Come Back Tomorrow
                </button>
                <a
                  href="/pricing"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-colors"
                >
                  Upgrade to Pro
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .fade-in {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}

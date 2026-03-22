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

// Fire confetti on first conversion
async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default
  confetti({ colors: ['#8b5cf6', '#22d3ee', '#ffffff', '#c4b5fd'], particleCount: 100, spread: 70, origin: { y: 0.6 } })
  setTimeout(() => confetti({ colors: ['#8b5cf6', '#22d3ee'], particleCount: 50, spread: 100, origin: { y: 0.7 } }), 300)
}

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
  const [compressImages, setCompressImages] = useState(true)
  const [compressionQuality, setCompressionQuality] = useState(80)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<ImageResult[]>([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [conversionCount, setConversionCount] = useState(0)
  const [displayCount, setDisplayCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const count = localStorage.getItem('img64_conversion_count')
      if (count) {
        const target = parseInt(count, 10)
        setConversionCount(target)
        // Animate counter from 0 to target
        let current = 0
        const step = Math.ceil(target / 60)
        const timer = setInterval(() => {
          current = Math.min(current + step, target)
          setDisplayCount(current)
          if (current >= target) clearInterval(timer)
        }, 16)
        return () => clearInterval(timer)
      }
    }
  }, [])

  const isPro = session?.user?.isPro || false
  const isAuthenticated = status === 'authenticated'

  const loadHistory = useCallback(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  }, [])

  const saveToHistory = useCallback((result: ImageResult) => {
    if (typeof window === 'undefined') return
    try {
      const hist = loadHistory()
      const newHistory = [result, ...hist].slice(0, MAX_HISTORY)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
    } catch { /* ignore */ }
  }, [loadHistory])

  const clearHistory = useCallback(() => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(HISTORY_KEY)
    showToastMessage('History cleared!')
  }, [])

  useEffect(() => {
    if (showHistory) setHistory(loadHistory())
  }, [showHistory, loadHistory])

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
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file
    const quality = isPro ? Math.max(compressionQuality, 90) : compressionQuality
    const options = {
      maxSizeMB: isPro ? 5 : 1,
      maxWidthOrHeight: isPro ? 8192 : 4096,
      useWebWorker: true,
      initialQuality: quality / 100,
    }
    try { return await imageCompression(file, options) }
    catch { return file }
  }

  const checkAndIncrementUsage = (fileCount: number): boolean => {
    if (isPro) return true
    const currentUsage = getUsage().count
    if (currentUsage + fileCount > FREE_DAILY_LIMIT) { setShowLimitModal(true); return false }
    for (let i = 0; i < fileCount; i++) incrementUsage()
    return true
  }

  const processFiles = async (files: File[]) => {
    const fileArray = files.filter(f => f.type.startsWith('image/'))
    if (fileArray.length === 0) { showToastMessage('Please select image files'); return }
    if (!checkAndIncrementUsage(fileArray.length)) return

    for (const file of fileArray) {
      const originalSize = file.size
      const processedFile = await compressFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUri = e.target?.result as string
        const base64 = dataUri.split(',')[1]
        const img = new Image()
        img.onload = () => {
          const wasCompressed = processedFile.size < originalSize
          const newResult: ImageResult = {
            id: generateId(), dataUri, base64,
            fileName: file.name, fileSize: processedFile.size,
            originalFileSize: originalSize, mimeType: processedFile.type || file.type,
            width: img.width, height: img.height,
            compressed: wasCompressed, timestamp: Date.now(),
          }
          setResults(prev => [newResult, ...prev])
          setSelectedId(newResult.id)
          saveToHistory(newResult)
          trackConversion(newResult)
          const newCount = conversionCount + 1
          setConversionCount(newCount)
          setDisplayCount(newCount)
          localStorage.setItem('img64_conversion_count', newCount.toString())
          // 🎊 Confetti on very first conversion ever
          if (newCount === 1) fireConfetti()
        }
        img.src = dataUri
      }
      reader.readAsDataURL(processedFile)
    }
    const savedMsg = compressImages ? ' (optimized)' : ''
    showToastMessage(`${fileArray.length} image${fileArray.length > 1 ? 's' : ''} converted${savedMsg}`)
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    await processFiles(Array.from(files))
  }, [compressImages, compressionQuality, isPro])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files)
  }, [handleFiles])
  const handleBatchFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files)
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
    setToastMessage(msg); setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const trackEvent = useCallback((eventName: string, params?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).gtag) {
      (window as unknown as Record<string, (...args: unknown[]) => void>).gtag('event', eventName, params)
    }
  }, [])

  const trackConversion = useCallback((result: ImageResult) => {
    trackEvent('image_converted', { file_type: result.mimeType, file_size: result.fileSize, compressed: result.compressed, is_pro: isPro })
  }, [trackEvent, isPro])

  const getCopyText = (result: ImageResult): string => {
    switch (copyFormat) {
      case 'base64': return result.base64
      case 'css': return `background-image: url('${result.dataUri}');`
      case 'img': return `<img src="${result.dataUri}" alt="${result.fileName}" width="${result.width}" height="${result.height}" />`
      case 'json': return JSON.stringify({ fileName: result.fileName, mimeType: result.mimeType, width: result.width, height: result.height, base64: result.base64 }, null, 2)
      default: return result.dataUri
    }
  }

  const copyToClipboard = async (result: ImageResult) => {
    const text = getCopyText(result)
    await navigator.clipboard.writeText(text)
    const formatNames: Record<string, string> = { dataUri: 'Data URI', base64: 'Base64', css: 'CSS', img: 'HTML', json: 'JSON' }
    showToastMessage(`${formatNames[copyFormat]} copied!`)
  }

  const copyAll = async () => {
    const allData = results.map(r => ({ fileName: r.fileName, dataUri: r.dataUri, base64: r.base64 }))
    await navigator.clipboard.writeText(JSON.stringify(allData, null, 2))
    showToastMessage('All results copied as JSON!')
  }

  const removeResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const clearAll = () => {
    setResults([]); setSelectedId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const selected = results.find(r => r.id === selectedId)

  const formats = [
    { key: 'dataUri', label: 'Data URI' },
    { key: 'base64', label: 'Base64' },
    { key: 'css', label: 'CSS' },
    { key: 'img', label: 'HTML <img>' },
    { key: 'json', label: 'JSON' },
  ]

  return (
    <>
      {/* Animated background */}
      <div className="mesh-bg" />
      <div className="grid-overlay" />

      <div className="relative z-10 min-h-screen">
        {/* ── Header ─────────────────────────────────────────── */}
        <header className="py-6 px-6">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <a href="/" className="relative group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 opacity-20 blur-md group-hover:opacity-40 transition-opacity" />
                <img 
                  src="/logo.png" 
                  alt="img64 logo" 
                  className="relative w-10 h-10 rounded-xl object-contain"
                />
              </a>
              <span className="text-xl font-bold gradient-text tracking-tight">img64</span>
              {isPro && <ProBadge />}
            </div>

            {/* Nav actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="btn-ghost p-2 rounded-lg text-sm"
                aria-label="Toggle history"
                title="Conversion history"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <a
                href="https://ko-fi.com/nutshot2000"
                target="_blank"
                rel="noopener noreferrer"
                title="Support this project"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(41,171,224,0.1)', border: '1px solid rgba(41,171,224,0.2)', color: '#29abe0' }}
              >
                ☕ <span className="hidden sm:inline">Support</span>
              </a>
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <img src={session.user?.image || ''} alt={session.user?.name || ''} className="w-8 h-8 rounded-full ring-2 ring-violet-500/30" />
                  <button onClick={() => signOut()} className="btn-ghost px-3 py-1.5 rounded-lg text-sm">Sign out</button>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="btn-primary px-4 py-2 rounded-xl text-sm"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="pt-10 pb-8 px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-6 text-xs font-medium text-violet-300 border border-violet-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              100% local — images never leave your device
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold mb-4 leading-tight">
              Image <span className="gradient-text text-glow">→</span> Base64
            </h1>
            <p className="text-lg text-slate-400 mb-4 max-w-xl mx-auto">
              Drag, drop, or paste any image. Instant conversion with no upload, no server, no nonsense.
            </p>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs font-mono">Ctrl</kbd>
              +
              <kbd className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs font-mono">V</kbd>
              to paste from clipboard
            </p>
          </div>

          {/* Usage tracker */}
          <div className="mt-5 max-w-sm mx-auto">
            <UsageTracker isPro={isPro} />
          </div>
        </section>

        {/* ── Main content ─────────────────────────────────────── */}
        <main className="max-w-5xl mx-auto px-6 pb-20">

          {/* Drop Zone */}
          <div
            className={`drop-zone drop-zone-glow glass rounded-3xl p-16 text-center cursor-pointer transition-all duration-300 ${isDragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}>
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full" />
                <svg
                  className={`relative w-16 h-16 icon-pulse ${isDragging ? 'text-cyan-400' : 'text-violet-400'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-2xl font-semibold text-white mb-2">
                {isDragging ? 'Drop it!' : 'Drop images here'}
              </p>
              <p className="text-slate-400 mb-6">or click to browse • multiple files supported</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['PNG', 'JPG', 'GIF', 'WebP', 'SVG', 'BMP'].map(fmt => (
                  <span key={fmt} className="format-badge px-3 py-1 rounded-full">{fmt}</span>
                ))}
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
          </div>

          {/* Controls Row */}
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            {/* Auto-compress */}
            <div className="glass rounded-2xl p-4 flex items-center justify-between gap-4">
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={compressImages}
                    onChange={(e) => setCompressImages(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 rounded-full bg-white/10 peer-checked:bg-violet-600 transition-all duration-200 border border-white/10 peer-checked:border-violet-500" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Auto-compress</p>
                  <p className="text-xs text-slate-500">Reduce file size while converting</p>
                </div>
              </label>
              {compressImages && (
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="range"
                    min={isPro ? "90" : "50"}
                    max="100"
                    value={compressionQuality}
                    onChange={(e) => setCompressionQuality(Number(e.target.value))}
                    className="w-20 accent-violet-500"
                  />
                  <span className="text-xs font-mono text-violet-300 w-9 text-right">{compressionQuality}%</span>
                </div>
              )}
            </div>

            {/* Batch Upload */}
            <div className="glass rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ProBadge />
                <div>
                  <p className="text-sm font-medium text-white">Batch Upload</p>
                  <p className="text-xs text-slate-500">Upload multiple files at once</p>
                </div>
              </div>
              {isPro ? (
                <>
                  <button onClick={() => batchFileInputRef.current?.click()} className="btn-primary px-4 py-2 rounded-xl text-sm shrink-0">
                    Select Files
                  </button>
                  <input ref={batchFileInputRef} type="file" accept="image/*" multiple onChange={handleBatchFileChange} className="hidden" />
                </>
              ) : (
                <button onClick={() => setShowUpgradeModal(true)} className="px-4 py-2 rounded-xl text-sm text-slate-500 bg-white/5 border border-white/5 shrink-0 cursor-not-allowed">
                  Pro Only
                </button>
              )}
            </div>
          </div>

          {/* ── Results ────────────────────────────────────────── */}
          {results.length > 0 && (
            <div className="mt-10 fade-in">
              {/* Counter */}
              {conversionCount > 0 && (
                <div className="text-center mb-6">
                  <span className="text-slate-500 text-sm">🎉 </span>
                  <span className="font-bold gradient-text">{displayCount.toLocaleString()}</span>
                  <span className="text-slate-500 text-sm"> conversions on img64.dev</span>
                </div>
              )}

              {/* Controls bar */}
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="section-label">Results</span>
                  <span className="text-sm text-slate-500">{results.length} image{results.length > 1 ? 's' : ''}</span>
                  {results.length > 1 && (
                    <button onClick={copyAll} className="btn-ghost px-3 py-1.5 rounded-lg text-xs">Copy All as JSON</button>
                  )}
                </div>
                <button onClick={() => { clearAll(); localStorage.removeItem(HISTORY_KEY) }} className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
                  Clear All
                </button>
              </div>

              {/* Format tabs */}
              <div className="flex flex-wrap gap-2 mb-5 p-3 glass rounded-2xl">
                <span className="text-xs text-slate-500 self-center mr-1">Copy as:</span>
                {formats.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setCopyFormat(key as typeof copyFormat)}
                    className={`format-tab px-3 py-1.5 rounded-xl ${copyFormat === key ? 'active' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Results grid */}
              <div className="grid gap-3 md:grid-cols-2">
                {results.map(result => (
                  <div
                    key={result.id}
                    onClick={() => setSelectedId(result.id)}
                    className={`result-card rounded-2xl p-4 cursor-pointer ${selectedId === result.id ? 'selected' : ''}`}
                  >
                    <div className="flex gap-4 items-center">
                      <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-black/30 ring-1 ring-white/5">
                        <img src={result.dataUri} alt={result.fileName} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate text-sm">{result.fileName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {result.width} × {result.height} · {formatBytes(result.fileSize)}
                          {result.compressed && result.originalFileSize > result.fileSize && (
                            <span className="ml-2 text-emerald-400 font-medium">
                              ↓{Math.round((1 - result.fileSize / result.originalFileSize) * 100)}%
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatBytes(result.base64.length)} Base64</p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(result) }}
                          className="btn-primary p-2 rounded-xl"
                          title="Copy"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeResult(result.id) }}
                          className="btn-ghost p-2 rounded-xl text-slate-500 hover:text-red-400"
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

              {/* Full preview for selected */}
              {selected && (
                <div className="mt-5 glass rounded-2xl p-6 slide-up">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-white text-sm">Full Preview</h2>
                    <span className="text-xs text-slate-500">{selected.fileName}</span>
                  </div>
                  <div className="flex justify-center bg-black/30 rounded-xl p-4 mb-4">
                    <img src={selected.dataUri} alt={selected.fileName} className="max-w-full max-h-72 rounded-lg" />
                  </div>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={getCopyText(selected)}
                      className="code-output w-full h-28 rounded-xl p-3 focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(selected)}
                      className="btn-primary absolute top-2 right-2 px-3 py-1.5 rounded-lg text-xs"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Feature grid ─────────────────────────────────── */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: '🔒', title: '100% Private', desc: 'No uploads ever' },
              { icon: '⚡', title: 'Instant', desc: 'Zero latency' },
              { icon: '📡', title: 'Works Offline', desc: 'No server needed' },
              { icon: '🗜️', title: 'Auto-Optimize', desc: 'Smart compression' },
              { icon: '🎨', title: 'Multi-Format', desc: 'URI, CSS, HTML, JSON' },
            ].map((f, i) => (
              <div key={i} className="glass rounded-2xl p-4 text-center hover:border-violet-500/30 transition-all duration-200 hover:-translate-y-0.5">
                <div className="text-2xl mb-2">{f.icon}</div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* ── Quick guide ───────────────────────────────────── */}
          <div className="mt-6 glass rounded-2xl p-6">
            <p className="section-label mb-5">Quick Guide</p>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { step: '01', title: 'Add Images', desc: 'Drag, click, or paste (Ctrl+V)' },
                { step: '02', title: 'Choose Format', desc: 'Data URI, Base64, CSS, HTML, or JSON' },
                { step: '03', title: 'Copy & Use', desc: 'Paste into your code or project' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 items-start">
                  <span className="text-2xl font-bold gradient-text-subtle shrink-0 leading-none">{item.step}</span>
                  <div>
                    <p className="font-semibold text-white text-sm">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Use cases ────────────────────────────────────── */}
          <div className="mt-6 glass rounded-2xl p-6">
            <p className="section-label mb-4">Common Use Cases</p>
            <div className="flex flex-wrap gap-2">
              {['Email signatures', 'Inline CSS images', 'API payloads', 'Data URIs for HTML', 'Embedding icons', 'Small image storage', 'Prototyping', 'Icon fonts'].map((use, i) => (
                <span key={i} className="format-badge px-3 py-1.5 rounded-full text-sm">{use}</span>
              ))}
            </div>
          </div>

          {/* ── Share section ─────────────────────────────────── */}
          <div className="mt-6 glass rounded-2xl p-6 text-center">
            <p className="font-semibold text-white mb-1">Love this tool?</p>
            <p className="text-sm text-slate-400 mb-5">Help other developers discover it</p>
            <div className="flex justify-center gap-3">
              <a
                href={shareTwitter('https://img64.dev/?v=1', 'Convert images to Base64 instantly & for free. No upload needed! 🚀')}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1DA1F2]/10 border border-[#1DA1F2]/20 text-[#1DA1F2] text-sm font-medium hover:bg-[#1DA1F2]/20 transition-all hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Share on X
              </a>
              <a
                href={shareReddit('https://img64.dev/?v=1', 'Free Image to Base64 Converter - Instant, Local & No Uploads')}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] text-sm font-medium hover:bg-[#FF4500]/20 transition-all hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                Share on Reddit
              </a>
            </div>
          </div>

          {/* ── FAQ / SEO Article ─────────────────────────────── */}
          <article className="mt-6 glass rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-8">What is Base64 Image Encoding?</h2>
            <div className="space-y-8">
              <section>
                <h3 className="text-base font-semibold gradient-text-subtle mb-2">How does it work?</h3>
                <p className="text-sm text-slate-400 leading-relaxed">Base64 is an encoding algorithm that transforms any binary data, including images, into text format containing only readable ASCII characters. When you convert an image to Base64 — creating a Data URI — you can embed it directly into HTML, CSS, or JSON without relying on external file requests.</p>
              </section>
              <section>
                <h3 className="text-base font-semibold gradient-text-subtle mb-3">Why convert images to Base64?</h3>
                <ul className="space-y-2.5">
                  {[
                    ['Fewer HTTP Requests', 'Embedding images directly removes separate file downloads, speeding up page load for small icons and assets.'],
                    ['Offline Availability', 'Data URIs embedded in HTML or CSS load without a network connection.'],
                    ['Streamlined Emails', 'HTML emails often block external images — Base64 encoding bypasses this for signatures and logos.'],
                    ['API Portability', 'Many REST APIs only accept JSON text. Base64 lets you send images as simple JSON string payloads.'],
                  ].map(([title, desc]) => (
                    <li key={title} className="flex gap-3 text-sm">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5" />
                      <span className="text-slate-400"><strong className="text-slate-300 font-medium">{title}:</strong> {desc}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="text-base font-semibold gradient-text-subtle mb-2">Is this converter secure?</h3>
                <p className="text-sm text-slate-400 leading-relaxed">Yes! <strong className="text-slate-300">img64</strong> operates completely locally in your browser. Files never leave your device — no server upload, no logging, guaranteed 100% privacy.</p>
              </section>
            </div>
          </article>
        </main>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="border-t border-white/5 py-10 px-6 text-center">
          <p className="text-sm text-slate-500 mb-4">Free & open source. No tracking, no ads, no BS.</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500 mb-5">
            <a href="/about" className="hover:text-violet-400 transition-colors">About</a>
            <a href="/contact" className="hover:text-violet-400 transition-colors">Contact</a>
            <a href="/pricing" className="font-semibold text-amber-400 hover:text-amber-300 transition-colors">Pricing</a>
            <a href="/privacy" className="hover:text-violet-400 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-violet-400 transition-colors">Terms</a>
            <a href="https://github.com/nutshot2000/-Image-to-Base64-Converter" target="_blank" rel="noopener" className="hover:text-violet-400 transition-colors">GitHub →</a>
          </div>
          <p className="mt-5 text-xs text-slate-600">© 2026 img64.dev · All rights reserved</p>
        </footer>
      </div>

      {/* ── History Sidebar ──────────────────────────────────── */}
      {showHistory && (
        <div className="fixed inset-y-0 right-0 w-80 z-50 flex flex-col" style={{ background: 'rgba(8,8,15,0.95)', backdropFilter: 'blur(24px)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-semibold text-white">History</h2>
            <button onClick={() => setShowHistory(false)} className="btn-ghost p-1.5 rounded-lg text-slate-400">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {history.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No conversion history yet.</p>
            ) : (
              <>
                <button onClick={() => { clearHistory(); setHistory([]) }} className="text-xs text-red-400/70 hover:text-red-400 mb-4 transition-colors">Clear History</button>
                <div className="space-y-2">
                  {history.map((item: ImageResult) => (
                    <div
                      key={item.id}
                      onClick={() => { setResults(prev => { if (prev.find(r => r.id === item.id)) return prev; return [item, ...prev] }); setSelectedId(item.id); setShowHistory(false) }}
                      className="p-3 rounded-xl glass cursor-pointer hover:border-violet-500/30 transition-all"
                    >
                      <div className="flex gap-3 items-center">
                        <img src={item.dataUri} alt={item.fileName} className="w-10 h-10 rounded-lg object-contain bg-black/30" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{item.fileName}</p>
                          <p className="text-xs text-slate-500">{formatBytes(item.fileSize)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────── */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 toast-enter">
          <div className="px-5 py-2.5 rounded-xl text-sm font-medium shadow-2xl text-white glass-bright glow-violet">
            {toastMessage}
          </div>
        </div>
      )}

      {/* ── Upgrade Modal ────────────────────────────────────── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-sm w-full glass rounded-2xl p-7 shadow-2xl text-center">
            <ProBadge className="mb-4 text-base px-4 py-2 mx-auto" />
            <h2 className="text-2xl font-bold text-white mb-2">Upgrade to Pro</h2>
            <p className="text-slate-400 text-sm mb-6">Unlimited conversions, batch uploads, high-quality compression, and more.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowUpgradeModal(false)} className="btn-ghost px-4 py-2 rounded-xl text-sm">Maybe Later</button>
              <a href="/pricing" className="btn-primary px-5 py-2 rounded-xl text-sm">View Pricing</a>
            </div>
          </div>
        </div>
      )}

      {/* ── Limit Modal ──────────────────────────────────────── */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-sm w-full glass rounded-2xl p-7 shadow-2xl text-center">
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="text-2xl font-bold text-white mb-2">Daily Limit Reached</h2>
            <p className="text-slate-400 text-sm mb-2">You&apos;ve used all {FREE_DAILY_LIMIT} free conversions for today.</p>
            <p className="text-slate-400 text-sm mb-6">Upgrade to Pro for unlimited conversions!</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowLimitModal(false)} className="btn-ghost px-4 py-2 rounded-xl text-sm">Come Back Tomorrow</button>
              <a href="/pricing" className="btn-primary px-5 py-2 rounded-xl text-sm">Upgrade to Pro</a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

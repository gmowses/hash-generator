import { useState, useCallback, useEffect, useRef } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import { Copy, Check, Sun, Moon, Languages, Upload, FileText, X, Hash, ShieldCheck } from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'Hash Generator',
    subtitle: 'Generate cryptographic hashes via Web Crypto API. Everything runs client-side — no data leaves your browser.',
    textTab: 'Text',
    fileTab: 'File',
    textLabel: 'Input text',
    textPlaceholder: 'Type or paste text to hash...',
    fileDrop: 'Drop a file here',
    fileOr: 'or click to select',
    fileSelected: 'File selected',
    fileRemove: 'Remove',
    noInput: 'Enter text or select a file above to generate hashes.',
    hashes: 'Hashes',
    copy: 'Copy',
    copied: 'Copied!',
    compareMode: 'Compare mode',
    comparePlaceholder: 'Paste a hash to verify...',
    matchYes: 'Match',
    matchNo: 'No match',
    statsLabel: 'Input stats',
    statsSize: 'Size',
    statsEncoding: 'Encoding',
    statsChars: 'Characters',
    statsBytes: 'bytes',
    computing: 'Computing...',
    builtBy: 'Built by',
    disclaimer: 'No data is sent to any server. All hashing runs locally via the Web Crypto API.',
  },
  pt: {
    title: 'Gerador de Hash',
    subtitle: 'Gere hashes criptograficos via Web Crypto API. Tudo roda no navegador — nenhum dado sai do seu browser.',
    textTab: 'Texto',
    fileTab: 'Arquivo',
    textLabel: 'Texto de entrada',
    textPlaceholder: 'Digite ou cole o texto para gerar o hash...',
    fileDrop: 'Solte um arquivo aqui',
    fileOr: 'ou clique para selecionar',
    fileSelected: 'Arquivo selecionado',
    fileRemove: 'Remover',
    noInput: 'Digite um texto ou selecione um arquivo acima para gerar os hashes.',
    hashes: 'Hashes',
    copy: 'Copiar',
    copied: 'Copiado!',
    compareMode: 'Modo comparacao',
    comparePlaceholder: 'Cole um hash para verificar...',
    matchYes: 'Corresponde',
    matchNo: 'Nao corresponde',
    statsLabel: 'Estatisticas',
    statsSize: 'Tamanho',
    statsEncoding: 'Codificacao',
    statsChars: 'Caracteres',
    statsBytes: 'bytes',
    computing: 'Calculando...',
    builtBy: 'Criado por',
    disclaimer: 'Nenhum dado e enviado ao servidor. Todo o hash e executado localmente via Web Crypto API.',
  },
} as const

type Lang = keyof typeof translations

// ── Hash algorithms ──────────────────────────────────────────────────────────
const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const
type Algorithm = (typeof ALGORITHMS)[number]

async function computeHash(algo: Algorithm, buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(algo, buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function computeAllHashes(buffer: ArrayBuffer): Promise<Record<Algorithm, string>> {
  const results = await Promise.all(ALGORITHMS.map(algo => computeHash(algo, buffer)))
  return Object.fromEntries(ALGORITHMS.map((algo, i) => [algo, results[i]])) as Record<Algorithm, string>
}

function textToBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer
}

function detectEncoding(text: string): string {
  const hasNonAscii = /[^\x00-\x7F]/.test(text)
  return hasNonAscii ? 'UTF-8' : 'ASCII'
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

// ── Component ────────────────────────────────────────────────────────────────
export default function HashGenerator() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('pt') ? 'pt' : 'en'))
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text')

  // Inputs
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Hashes
  const [hashes, setHashes] = useState<Partial<Record<Algorithm, string>>>({})
  const [computing, setComputing] = useState(false)
  const [copiedAlgo, setCopiedAlgo] = useState<Algorithm | null>(null)

  // Compare mode
  const [compareHash, setCompareHash] = useState('')

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const t = translations[lang]

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  // Compute hashes
  const runHashes = useCallback(async (buffer: ArrayBuffer) => {
    setComputing(true)
    try {
      const result = await computeAllHashes(buffer)
      setHashes(result)
    } finally {
      setComputing(false)
    }
  }, [])

  // Text input with debounce
  useEffect(() => {
    if (activeTab !== 'text') return
    if (!text) { setHashes({}); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void runHashes(textToBuffer(text))
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [text, activeTab, runHashes])

  // File input
  useEffect(() => {
    if (activeTab !== 'file') return
    if (!file) { setHashes({}); return }
    file.arrayBuffer().then(buf => runHashes(buf)).catch(() => setHashes({}))
  }, [file, activeTab, runHashes])

  const handleCopy = (algo: Algorithm) => {
    const hash = hashes[algo]
    if (!hash) return
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedAlgo(algo)
      setTimeout(() => setCopiedAlgo(null), 2000)
    })
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (picked) setFile(picked)
  }

  // Stats
  const inputBytes = activeTab === 'text' ? new TextEncoder().encode(text).length : (file?.size ?? 0)
  const hasInput = activeTab === 'text' ? text.length > 0 : file !== null
  const hasHashes = Object.keys(hashes).length > 0

  // Compare
  const compareNorm = compareHash.trim().toLowerCase()
  const matchResult: 'match' | 'nomatch' | null = compareNorm && hasHashes
    ? (Object.values(hashes).some(h => h === compareNorm) ? 'match' : 'nomatch')
    : null

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Hash size={18} className="text-white" />
            </div>
            <span className="font-semibold">Hash Generator</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle language"
            >
              <Languages size={14} />
              {lang.toUpperCase()}
            </button>
            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle theme"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a
              href="https://github.com/gmowses/hash-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="GitHub"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-1 w-fit">
            {(['text', 'file'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setHashes({}) }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {tab === 'text' ? <FileText size={14} /> : <Upload size={14} />}
                {tab === 'text' ? t.textTab : t.fileTab}
              </button>
            ))}
          </div>

          {/* Input panel */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            {activeTab === 'text' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.textLabel}</label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={t.textPlaceholder}
                  rows={5}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-colors placeholder:text-zinc-400"
                />
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !file && fileInputRef.current?.click()}
                className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-orange-500 bg-orange-500/5'
                    : file
                    ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30 cursor-default'
                    : 'border-zinc-300 dark:border-zinc-700 hover:border-orange-400 hover:bg-orange-500/5'
                } px-6 py-10 flex flex-col items-center gap-3`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {file ? (
                  <>
                    <FileText size={32} className="text-orange-500" />
                    <div className="text-center">
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-zinc-500 mt-1">{fmtBytes(file.size)}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setFile(null); setHashes({}); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-500 transition-colors mt-1"
                    >
                      <X size={12} />
                      {t.fileRemove}
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={32} className={isDragging ? 'text-orange-500' : 'text-zinc-400'} />
                    <div className="text-center">
                      <p className="text-sm font-medium">{t.fileDrop}</p>
                      <p className="text-xs text-zinc-500 mt-1">{t.fileOr}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Stats */}
            {hasInput && (
              <div className="flex flex-wrap gap-3 pt-1">
                {activeTab === 'text' && (
                  <>
                    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-0.5">{t.statsChars}</p>
                      <p className="text-sm font-semibold tabular-nums">{text.length.toLocaleString()}</p>
                    </div>
                    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-0.5">{t.statsEncoding}</p>
                      <p className="text-sm font-semibold">{detectEncoding(text)}</p>
                    </div>
                  </>
                )}
                <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-0.5">{t.statsSize}</p>
                  <p className="text-sm font-semibold tabular-nums">{fmtBytes(inputBytes)}</p>
                </div>
                {activeTab === 'file' && file && (
                  <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-0.5">MIME</p>
                    <p className="text-sm font-semibold">{file.type || 'unknown'}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hashes output */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
            <h2 className="font-semibold">{t.hashes}</h2>

            {!hasInput && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.noInput}</p>
            )}

            {hasInput && computing && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <svg className="animate-spin h-4 w-4 text-orange-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {t.computing}
              </div>
            )}

            {hasHashes && !computing && (
              <div className="space-y-4">
                {ALGORITHMS.map(algo => {
                  const hash = hashes[algo] ?? ''
                  const isCopied = copiedAlgo === algo
                  const compareNormCheck = compareNorm
                  const isMatch = compareNormCheck ? hash === compareNormCheck : null

                  return (
                    <div key={algo} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold font-mono text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded">{algo}</span>
                          {isMatch === true && (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck size={12} />
                              {t.matchYes}
                            </span>
                          )}
                          {isMatch === false && (
                            <span className="text-xs font-medium text-zinc-400 line-through">{t.matchNo}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleCopy(algo)}
                          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-500 transition-colors"
                        >
                          {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          {isCopied ? t.copied : t.copy}
                        </button>
                      </div>
                      <div
                        onClick={() => handleCopy(algo)}
                        title={t.copy}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2.5 font-mono text-xs break-all select-all cursor-pointer hover:border-orange-400 transition-colors"
                        style={isMatch === true ? { borderColor: 'rgb(16 185 129 / 0.5)', backgroundColor: 'rgb(16 185 129 / 0.05)' } : undefined}
                      >
                        {hash}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Compare mode */}
          {hasHashes && !computing && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
              <div>
                <h2 className="font-semibold">{t.compareMode}</h2>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={compareHash}
                  onChange={e => setCompareHash(e.target.value)}
                  placeholder={t.comparePlaceholder}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-colors placeholder:text-zinc-400"
                  style={
                    matchResult === 'match'
                      ? { borderColor: 'rgb(16 185 129 / 0.6)', backgroundColor: 'rgb(16 185 129 / 0.05)' }
                      : matchResult === 'nomatch'
                      ? { borderColor: 'rgb(239 68 68 / 0.5)', backgroundColor: 'rgb(239 68 68 / 0.05)' }
                      : undefined
                  }
                />
                {compareHash && (
                  <button
                    onClick={() => setCompareHash('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {matchResult === 'match' && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck size={16} />
                  {t.matchYes} — {Object.entries(hashes).find(([, v]) => v === compareNorm)?.[0]}
                </div>
              )}
              {matchResult === 'nomatch' && (
                <p className="text-sm text-red-500">{t.matchNo}</p>
              )}
            </div>
          )}

          <p className="text-[11px] text-zinc-400 text-center">{t.disclaimer}</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>
            {t.builtBy}{' '}
            <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-orange-500 transition-colors">
              Gabriel Mowses
            </a>
          </span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}

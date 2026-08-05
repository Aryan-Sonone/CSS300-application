import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardContent } from '../components/ui/Card'
import { KeyInput } from '../components/Setup/KeyInput'
import { PhaseCheckboxes } from '../components/Setup/PhaseCheckboxes'
import { ConnectionBadge, TestingBadge } from '../components/Setup/ConnectionBadge'
import { useEngine } from '../hooks/useEngine'
import { useToast } from '../hooks/useToast'
import { db } from '../storage/db'
import { getEncryptedKey, setEncryptedKey, decryptKey } from '../storage/keyVault'
import { PROVIDERS, providerByName, providerDisplayName } from '../lib/providers'
import { RunConfig, ConnectionResult, EngineNotConnectedError } from '../lib/types'
import { Sliders, Key, Cpu, Shield, Play, Save, RefreshCw, Key as KeyIcon } from 'lucide-react'

// Stagger propagates through motion components only, so the grid and both
// columns are motion.div — the plain wrappers in between would break the chain.
const bentoGrid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const bentoCard = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
}

// Sampling seed is no longer user-facing, but the Rust runner and the Python
// sidecar both deserialize it as a required field, so the payload keeps a fixed
// value — sample selection stays reproducible across runs.
const SAMPLING_SEED = 42

// Resolve the real API key: an empty field means "use the key already stored for
// this provider"; anything typed wins over the stored ciphertext.
async function resolveKey(displayValue: string, provider: string): Promise<string> {
  if (displayValue) return displayValue
  const encrypted = await getEncryptedKey(provider)
  if (!encrypted) return ''
  try {
    return await decryptKey(encrypted)
  } catch {
    return ''
  }
}

export function SetupPage() {
  const navigate = useNavigate()
  const engine = useEngine()
  const { success, error } = useToast()

  const [provider, setProvider] = useState('nvidia_nim')
  const [apiKey, setApiKey] = useState('')
  const [modelId, setModelId] = useState('')
  const [useSameProvider, setUseSameProvider] = useState(true)
  const [scoringProvider, setScoringProvider] = useState('nvidia_nim')
  const [scoringApiKey, setScoringApiKey] = useState('')
  const [scoringModelId, setScoringModelId] = useState('')
  const [datasetMode, setDatasetMode] = useState<'full' | 'sample'>('sample')
  const [sampleSize, setSampleSize] = useState(50)
  const [phases, setPhases] = useState({ phase1: true, phase2: false, phase3: false, phase4: false })
  const [modelType, setModelType] = useState<'standard' | 'thinking'>('standard')
  const [isTesting, setIsTesting] = useState(false)
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshingModels, setIsRefreshingModels] = useState(false)
  const [fetchedModels, setFetchedModels] = useState<string[]>([])
  const [isStarting, setIsStarting] = useState(false)
  // A key exists in the vault/keyring but is never mirrored into the input —
  // it only drives the placeholder hint and the "can we proceed" guards.
  const [hasStoredKey, setHasStoredKey] = useState(false)
  const [hasStoredScoringKey, setHasStoredScoringKey] = useState(false)

  // Load API key from Tauri keyring on mount (for NVIDIA NIM)
  useEffect(() => {
    const loadKeyring = async () => {
      try {
        const key = await invoke('load_api_key', { provider: 'nvidia_nim' })
        if (key) {
          setHasStoredKey(true)
        }
      } catch {
        // Ignore in web build
      }
    }
    loadKeyring()
  }, [])

  // Load saved config on mount
  useEffect(() => {
    const loadConfig = async () => {
      const configs = await db.configs.toArray()
      const latest = configs.sort((a, b) => b.updatedAt - a.updatedAt)[0]
      if (latest) {
        const cfg = latest.config
        setProvider(cfg.testModel.provider)
        setModelId(cfg.testModel.modelId)
        const key = await getEncryptedKey(cfg.testModel.provider)
        if (key) setHasStoredKey(true)
        setUseSameProvider(cfg.useSameProvider)
        if (!cfg.useSameProvider && cfg.scoringModel) {
          setScoringProvider(cfg.scoringModel.provider)
          setScoringModelId(cfg.scoringModel.modelId)
          const skey = await getEncryptedKey(cfg.scoringModel.provider)
          if (skey) setHasStoredScoringKey(true)
        }
        setDatasetMode(cfg.datasetMode)
        setSampleSize(cfg.sampleSize)
        setPhases(cfg.phases)
        setModelType(cfg.modelType)
      }
    }
    loadConfig()
  }, [])

  // Update model ID and fetch available models when provider changes.
  // Skipped on the first render: loadConfig() restores a saved model ID
  // asynchronously, and resetting to the provider default would clobber it.
  const firstProviderRun = useRef(true)
  useEffect(() => {
    const p = providerByName(provider)
    if (!p) return
    if (firstProviderRun.current) {
      firstProviderRun.current = false
      return
    }
    setModelId(p.defaultModel)
    setFetchedModels([])
    setApiKey('')
    getEncryptedKey(provider).then((k) => setHasStoredKey(!!k))
  }, [provider])

  const firstScoringProviderRun = useRef(true)
  useEffect(() => {
    const p = providerByName(scoringProvider)
    if (!p) return
    if (firstScoringProviderRun.current) {
      firstScoringProviderRun.current = false
      return
    }
    setScoringModelId(p.defaultModel)
    setScoringApiKey('')
    getEncryptedKey(scoringProvider).then((k) => setHasStoredScoringKey(!!k))
  }, [scoringProvider])

  const fetchModels = async (): Promise<boolean> => {
    if (!apiKey && !hasStoredKey) return false
    setIsRefreshingModels(true)
    try {
      const key = await resolveKey(apiKey, provider)
      if (!key) return false
      const models = await engine.getAvailableModels(provider, key)
      if (models && models.length > 0) {
        setFetchedModels(models)
        return true
      }
      return false
    } catch (err) {
      console.warn('Failed to fetch models:', err)
      return false
    } finally {
      setIsRefreshingModels(false)
    }
  }

  const handleRefreshModels = async () => {
    const ok = await fetchModels()
    if (ok) {
      success('Model list refreshed')
    } else {
      error('Failed to fetch models')
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setConnectionResult(null)

    try {
      const key = await resolveKey(apiKey, provider)
      const result = await engine.testConnection({ provider, apiKey: key, modelId })

      setConnectionResult(result)

      if (result.status === 'connected') {
        success(`Connected to ${providerDisplayName(provider)} (${result.latencyMs}ms)`)

        // Save to Tauri keyring if running in desktop app
        if (apiKey) {
          try {
            await invoke('save_api_key', { provider, key: apiKey })
          } catch {
            // Ignore keyring errors in web build
          }
        }

        // Auto-fetch available models now that the connection is verified
        fetchModels()
      } else if (result.status === 'invalid') {
        error(result.message || 'Connection failed')
      } else {
        error('Browser CORS blocked - requires desktop app')
      }
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : (err?.message || 'Test connection failed')
      setConnectionResult({ status: 'invalid', message: msg })
      error(msg)
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    // Encrypt and store keys when typed
    if (apiKey) {
      await setEncryptedKey(
        provider,
        await (async () => {
          const { encryptKey } = await import('../storage/keyVault')
          return encryptKey(apiKey)
        })()
      )
    }
    if (!useSameProvider && scoringApiKey) {
      await setEncryptedKey(
        scoringProvider,
        await (async () => {
          const { encryptKey } = await import('../storage/keyVault')
          return encryptKey(scoringApiKey)
        })()
      )
    }

    const config: RunConfig = {
      name: `${provider}-${modelId}-${new Date().toISOString().slice(0, 10)}`,
      testModel: { provider, apiKey: 'encrypted', modelId },
      useSameProvider,
      scoringModel: useSameProvider
        ? undefined
        : { provider: scoringProvider, apiKey: 'encrypted', modelId: scoringModelId },
      datasetMode,
      sampleSize,
      seed: SAMPLING_SEED,
      phases,
      modelType,
      updatedAt: Date.now(),
    }

    await db.configs.put({
      id: config.name,
      name: config.name,
      config,
      updatedAt: Date.now(),
    })

    setIsSaving(false)
    success('Configuration saved')
  }

  const handleStartBenchmark = async () => {
    setIsStarting(true)
    try {
      // Without this the empty id reaches the provider, returns 404, and the run
      // aborts with a message about the endpoint being dead instead of the real cause.
      if (!modelId.trim()) {
        error('Select a model first. Use Refresh Models or type a model ID.')
        return
      }

      const key = await resolveKey(apiKey, provider)
      if (!key) {
        error('No API key found. Enter and test your key first.')
        return
      }

      let scoringKey = ''
      if (!useSameProvider) {
        scoringKey = await resolveKey(scoringApiKey, scoringProvider)
        if (!scoringKey) {
          error('No scoring API key found. Enter and test your scoring key first.')
          return
        }
      }

      const config: RunConfig = {
        name: `${provider}-${modelId}-${new Date().toISOString().slice(0, 10)}`,
        testModel: { provider, apiKey: key, modelId },
        useSameProvider,
        scoringModel: useSameProvider
          ? undefined
          : { provider: scoringProvider, apiKey: scoringKey, modelId: scoringModelId },
        datasetMode,
        sampleSize,
        seed: SAMPLING_SEED,
        phases,
        modelType,
        updatedAt: Date.now(),
      }

      const handle = await engine.startBenchmark(config)
      success('Benchmark started')

      // Hand off to the Running page, which owns live progress + completion.
      // Strip API keys from the config we pass through router state.
      const safeConfig: RunConfig = {
        ...config,
        testModel: { ...config.testModel, apiKey: '' },
        scoringModel: config.scoringModel
          ? { ...config.scoringModel, apiKey: '' }
          : undefined,
      }
      navigate('/running', { state: { runId: handle.runId, config: safeConfig } })
    } catch (err) {
      if (err instanceof EngineNotConnectedError) {
        // Web build cannot run benchmarks — save config so desktop app can pick it up
        await handleSave()
        error('Running benchmarks requires the CSS-300 desktop app. Config saved.')
      } else {
        error(`Failed to start benchmark: ${err}`)
      }
    } finally {
      setIsStarting(false)
    }
  }

  const providerOptions = PROVIDERS.map((p) => ({ value: p.name, label: providerDisplayName(p.name) }))
  const thinkingModels = providerByName(provider)?.thinkingModels || []

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-6 h-6 text-truth" />
              <h1 className="text-3xl font-serif font-semibold text-text tracking-tight">Benchmark Setup</h1>
            </div>
            <p className="text-muted text-sm mt-1">
              Configure LLM provider parameters and execution options. Data is encrypted and saved locally.
            </p>
          </div>
        </div>

        {/* Main Bento Grid Form Layout */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={bentoGrid}
          initial="hidden"
          animate="show"
        >

          {/* Left Columns: Parameters */}
          <motion.div className="lg:col-span-2 space-y-6">

            {/* Card 1: Test Model Credentials */}
            <motion.div variants={bentoCard}>
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-2 text-text font-semibold text-base border-b border-border pb-3">
                  <Key className="w-4 h-4 text-truth" />
                  <h2>1. Test Model Credentials</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    options={providerOptions}
                  />

                  <KeyInput
                    label="API Key"
                    value={apiKey}
                    onChange={setApiKey}
                    placeholder="sk-..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    {fetchedModels.length > 0 ? (
                      <>
                        <Select
                          label={`Model ID (${fetchedModels.length} available)`}
                          value={modelId}
                          onChange={(e) => setModelId(e.target.value)}
                          options={fetchedModels.map((m) => ({ value: m, label: m }))}
                        />
                      </>
                    ) : (
                      <>
                        <Input
                          label="Model ID"
                          value={modelId}
                          onChange={(e) => setModelId(e.target.value)}
                          placeholder={providerByName(provider)?.defaultModel}
                          list={`${provider}-models`}
                        />
                        <datalist id={`${provider}-models`}>
                          {thinkingModels.map((m) => (
                            <option key={m} value={m} />
                          ))}
                        </datalist>
                      </>
                    )}
                  </div>

                  {apiKey && (
                    <Button
                      onClick={handleRefreshModels}
                      variant="secondary"
                      isLoading={isRefreshingModels}
                      className="w-full sm:w-auto h-10 px-4 bg-surface-2 hover:bg-border text-text border border-border font-medium text-xs rounded-xl transition-colors duration-200"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Refresh Models</span>
                    </Button>
                  )}

                  <Button
                    onClick={handleTestConnection}
                    isLoading={isTesting}
                    disabled={!apiKey || apiKey === ''}
                    className="w-full sm:w-auto h-10 px-5 bg-surface-2 hover:bg-border text-text border border-border font-medium text-xs rounded-xl transition-colors duration-200"
                  >
                    Test Connection
                  </Button>
                </div>

                {isTesting ? (
                  <TestingBadge />
                ) : connectionResult ? (
                  <ConnectionBadge
                    status={connectionResult.status}
                    latencyMs={connectionResult.latencyMs}
                    message={connectionResult.message}
                  />
                ) : null}
              </CardContent>
            </Card>
            </motion.div>

            {/* Card 2: Scoring Model Configuration */}
            <motion.div variants={bentoCard}>
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2 text-text font-semibold text-base">
                    <Shield className="w-4 h-4 text-thinking" />
                    <h2>2. Judge & Scoring Model</h2>
                  </div>

                  <label htmlFor="same-provider" className="flex items-center gap-2 cursor-pointer text-xs text-text transition-colors duration-200">
                    <input
                      type="checkbox"
                      id="same-provider"
                      checked={useSameProvider}
                      onChange={(e) => setUseSameProvider(e.target.checked)}
                      className="rounded border-border bg-surface-2 text-accent focus:ring-accent"
                    />
                    <span>Use same provider for scoring</span>
                  </label>
                </div>

                {!useSameProvider && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <Select
                      label="Scoring Provider"
                      value={scoringProvider}
                      onChange={(e) => setScoringProvider(e.target.value)}
                      options={providerOptions}
                    />
                    <KeyInput
                      label="Scoring API Key"
                      value={scoringApiKey}
                      onChange={setScoringApiKey}
                      placeholder="sk-..."
                    />
                    <Input
                      label="Scoring Model"
                      value={scoringModelId}
                      onChange={(e) => setScoringModelId(e.target.value)}
                      placeholder={providerByName(scoringProvider)?.defaultModel}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            </motion.div>

            {/* Card 3: Execution Settings */}
            <motion.div variants={bentoCard}>
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-2 text-text font-semibold text-base border-b border-border pb-3">
                  <Cpu className="w-4 h-4 text-truth" />
                  <h2>3. Dataset Parameters & Phases</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono uppercase text-muted mb-2">Dataset Mode</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-text cursor-pointer transition-colors duration-200">
                        <input
                          type="radio"
                          name="dataset-mode"
                          checked={datasetMode === 'full'}
                          onChange={() => setDatasetMode('full')}
                          className="text-accent focus:ring-accent bg-surface-2"
                        />
                        <span>Full Run (300)</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-text cursor-pointer transition-colors duration-200">
                        <input
                          type="radio"
                          name="dataset-mode"
                          checked={datasetMode === 'sample'}
                          onChange={() => setDatasetMode('sample')}
                          className="text-accent focus:ring-accent bg-surface-2"
                        />
                        <span>Sample Subset</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-mono uppercase text-muted">Sample Size</label>
                      <span className="text-xs font-mono text-truth font-bold tabular">{sampleSize} items</span>
                    </div>
                    <Input
                      type="range"
                      min="10"
                      max="150"
                      value={sampleSize}
                      onChange={(e) => setSampleSize(Number(e.target.value))}
                      className="w-full accent-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-muted mb-2">Model Type Architecture</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-text cursor-pointer transition-colors duration-200">
                      <input
                        type="radio"
                        name="model-type"
                        checked={modelType === 'standard'}
                        onChange={() => setModelType('standard')}
                        className="text-accent focus:ring-accent bg-surface-2"
                      />
                      <span>Standard</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-text cursor-pointer transition-colors duration-200">
                      <input
                        type="radio"
                        name="model-type"
                        checked={modelType === 'thinking'}
                        onChange={() => setModelType('thinking')}
                        className="text-accent focus:ring-accent bg-surface-2"
                      />
                      <span>Thinking / Reasoning</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <PhaseCheckboxes phases={phases} onChange={setPhases} modelType={modelType} />
                </div>
              </CardContent>
            </Card>
            </motion.div>

          </motion.div>

          {/* Right Action Sidebar */}
          <motion.div className="space-y-6">
            <motion.div variants={bentoCard}>
            <Card className="sticky top-24">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-text font-semibold text-base border-b border-border pb-3">Actions</h3>
                  <p className="text-xs text-muted mt-3 leading-relaxed">
                    Configurations saved here will automatically persist in IndexedDB for export into the CSS-300 Desktop Tauri app.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleStartBenchmark}
                    isLoading={isStarting}
                    className="w-full py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-bg font-bold text-sm shadow-lg shadow-accent/20 flex items-center justify-center gap-2 transition-colors duration-200"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isStarting ? 'Starting…' : 'Start Benchmark'}</span>
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={handleSave}
                    isLoading={isSaving}
                    className="w-full py-2.5 px-4 rounded-xl bg-surface-2 hover:bg-border text-text border border-border font-medium text-xs flex items-center justify-center gap-2 transition-colors duration-200"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Config Only</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </motion.div>

        </motion.div>
    </div>
  )
}
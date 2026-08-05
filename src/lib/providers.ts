// Provider catalog — sourced from the existing desktop app's providers.json (23 providers).
// `cors` is the Phase A CORS audit default (PRD §6.2): verified = browser-origin works,
// blocked = provider refuses browser requests, unconfirmed = not yet audited. The live
// Test Connection result overrides this at runtime per provider (Settings grid).

export type ProviderKind = 'openai' | 'anthropic' | 'local'
export type CorsStatus = 'verified' | 'blocked' | 'unconfirmed'

export interface Provider {
  name: string
  baseUrl: string
  defaultModel: string
  supportsThinking: boolean
  thinkingModels: string[]
  requiresAccountId?: boolean
  kind: ProviderKind
  cors: CorsStatus
}

export const PROVIDERS: Provider[] = [
  { name: 'openai', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'blocked' },
  { name: 'anthropic', baseUrl: 'https://api.anthropic.com/v1/', defaultModel: 'claude-3-opus-20240229', supportsThinking: false, thinkingModels: [], kind: 'anthropic', cors: 'blocked' },
  { name: 'nvidia_nim', baseUrl: 'https://integrate.api.nvidia.com/v1', defaultModel: 'meta/llama-3.1-8b-instruct', supportsThinking: true, thinkingModels: ['deepseek-ai/deepseek-v4-flash', 'deepseek-ai/deepseek-v4-pro', 'nvidia/nemotron-3-super-120b-a12b'], kind: 'openai', cors: 'unconfirmed' },
  { name: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4o', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'unconfirmed' },
  { name: 'google_ai_studio', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/', defaultModel: 'gemini-2.5-flash', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'blocked' },
  { name: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', supportsThinking: false, thinkingModels: ['deepseek-reasoner'], kind: 'openai', cors: 'blocked' },
  { name: 'mistral', baseUrl: 'https://api.mistral.ai/v1/', defaultModel: 'mistral-large-latest', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'blocked' },
  { name: 'cohere', baseUrl: 'https://api.cohere.ai/v1/', defaultModel: 'command-r-plus-08-2024', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'blocked' },
  { name: 'github_models', baseUrl: 'https://models.inference.ai.azure.com', defaultModel: 'openai/gpt-4o', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'unconfirmed' },
  { name: 'groq', baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3-70b-versatile', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'unconfirmed' },
  { name: 'sambanova', baseUrl: 'https://api.sambanova.ai/v1', defaultModel: 'Meta-Llama-3.1-70B-Instruct', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'unconfirmed' },
  { name: 'fireworks_ai', baseUrl: 'https://api.fireworks.ai/inference/v1', defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'unconfirmed' },
  { name: 'cerebras', baseUrl: 'https://api.cerebras.ai/v1', defaultModel: 'llama3.1-70b', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'unconfirmed' },
  { name: 'huggingface', baseUrl: 'https://api-inference.huggingface.co/models/', defaultModel: 'Qwen/Qwen2.5-72B-Instruct', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'unconfirmed' },
  { name: 'cloudflare_ai', baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/', defaultModel: '@cf/mistralai/mistral-7b-instruct-v0.1', requiresAccountId: true, supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'unconfirmed' },
  { name: 'wafer', baseUrl: 'https://api.wafer.ai/v1', defaultModel: 'DreamPie', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'unconfirmed' },
  { name: 'kimi', baseUrl: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'unconfirmed' },
  { name: 'minimax', baseUrl: 'https://api.minimax.chat/v1', defaultModel: 'abab6.5s-chat', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'unconfirmed' },
  { name: 'z_ai', baseUrl: 'https://api.z.ai/v1', defaultModel: 'glm-4-plus', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'unconfirmed' },
  { name: 'ollama_cloud', baseUrl: 'https://ollama.com/api', defaultModel: 'qwen2.5:7b', supportsThinking: false, thinkingModels: [], kind: 'openai', cors: 'unconfirmed' },
  { name: 'ollama', baseUrl: 'http://localhost:11434/v1', defaultModel: 'llama3.2', supportsThinking: false, thinkingModels: [], kind: 'local', cors: 'verified' },
  { name: 'lm_studio', baseUrl: 'http://localhost:1234/v1', defaultModel: 'any-loaded-model', supportsThinking: false, thinkingModels: [], kind: 'local', cors: 'verified' },
  { name: 'llamacpp', baseUrl: 'http://localhost:8080/v1', defaultModel: 'any-loaded-model', supportsThinking: false, thinkingModels: [], kind: 'local', cors: 'verified' },
]

export function providerByName(name: string): Provider | undefined {
  return PROVIDERS.find((p) => p.name === name)
}

export function providerDisplayName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')
}

// Web Crypto AES-GCM key vault for provider API keys
// Master key stored in IndexedDB (browser-bound per PRD §6.1)

import { db } from './db'

const MASTER_KEY_NAME = 'master-key'

async function getMasterKey(): Promise<CryptoKey> {
  const existing = await db.keys.get(MASTER_KEY_NAME)
  if (existing) {
    const jwk = JSON.parse(existing.encryptedKey)
    // Master key is stored raw in IndexedDB (browser-bound, not synced)
    return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  }

  // Generate new master key
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const jwk = await crypto.subtle.exportKey('jwk', key)
  await db.keys.put({ provider: MASTER_KEY_NAME, encryptedKey: JSON.stringify(jwk) })
  return key
}

export async function encryptKey(plainKey: string): Promise<string> {
  const masterKey = await getMasterKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plainKey)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, masterKey, encoded)

  const result = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  result.set(iv, 0)
  result.set(new Uint8Array(ciphertext), iv.byteLength)

  return btoa(String.fromCharCode(...result))
}

export async function decryptKey(encryptedBase64: string): Promise<string> {
  const masterKey = await getMasterKey()
  const decoded = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0))
  const iv = decoded.slice(0, 12)
  const ciphertext = decoded.slice(12)

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, masterKey, ciphertext)
  return new TextDecoder().decode(plaintext)
}

export async function clearAllKeys(): Promise<void> {
  await db.keys.clear()
}

export async function getEncryptedKey(provider: string): Promise<string | undefined> {
  const record = await db.keys.get(provider)
  return record?.encryptedKey
}

export async function setEncryptedKey(provider: string, encrypted: string): Promise<void> {
  await db.keys.put({ provider, encryptedKey: encrypted })
}
import { defineManifest } from '@crxjs/vite-plugin'
import { readFileSync } from 'node:fs'
import { createPublicKey } from 'node:crypto'

// Reads extension-key.pem and returns its public key as base64,
// exactly what Chrome expects in the manifest's "key" field.
function getExtensionKey(): string | undefined {
  try {
    const pem = readFileSync('./extension-key.pem', 'utf-8')
    const publicKey = createPublicKey(pem)
    return publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
  } catch {
    // File missing (e.g. fresh clone without the key) - just skip it,
    // Chrome will assign a random id instead.
    return undefined
  }
}

export default defineManifest({
  manifest_version: 3,
  name: 'Notes Project',
  version: '1.0.0',
  key: getExtensionKey(),
  description: 'Markdown note editor with wikilinks, Obsidian-style.',
  action: {
    default_popup: 'popup.html',
    default_icon: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
  icons: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  permissions: ['storage'],
  host_permissions: ['https://localhost:7269/*'],
})
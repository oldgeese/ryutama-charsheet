import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { resolveAppVersion } from './src/version'

const commitHash = (): string => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

const appVersion = resolveAppVersion(
  process.env['VITE_APP_VERSION'],
  commitHash,
)

export default defineConfig({
  plugins: [tailwindcss(), foldkit()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  optimizeDeps: {
    entries: ['src/entry.ts'],
  },
})

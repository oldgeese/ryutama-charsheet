import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

const commitHash = (): string => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

// 本番は CI が渡すリリースのタグ、それ以外はコミットハッシュをバージョンとして表示する
const appVersion = process.env['VITE_APP_VERSION'] || commitHash()

export default defineConfig({
  plugins: [tailwindcss(), foldkit()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  optimizeDeps: {
    entries: ['src/entry.ts'],
  },
})

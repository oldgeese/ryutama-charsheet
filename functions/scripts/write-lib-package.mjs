// Cloud Build は npm で依存を入れるので、workspace:* を含む package.json はそのまま渡せない。
// esbuild でまとめた lib には、外に出した実行時の依存だけを書いた package.json を置く。
// Firebase CLI は lib/node_modules から SDK を探すので、functions の node_modules へのリンクも置く（アップロードはされない）
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises'

const { name, type, engines, dependencies } = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
)
const lib = new URL('../lib/', import.meta.url)
await mkdir(lib, { recursive: true })
await writeFile(
  new URL('package.json', lib),
  `${JSON.stringify({ name, private: true, type, main: 'index.js', engines, dependencies }, null, 2)}\n`,
)
await symlink('../node_modules', new URL('node_modules', lib)).catch(error => {
  if (error.code !== 'EEXIST') throw error
})

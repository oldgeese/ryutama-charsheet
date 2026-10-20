# スキャフォールディング Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FoldKit（SPA）+ Firebase（Hosting / Firestore / Functions）の pnpm workspace を作り、Emulator 上で Web → Functions の Ping が動き、lint / typecheck / build / test / CI が通る状態にする。

**Architecture:** ルートを pnpm workspace にし、`apps/web`（create-foldkit-app の SPA 雛形）と `functions`（TypeScript の Cloud Functions v2）を置く。Firebase SDK は FoldKit の Resource `FirebaseService` に閉じ込め、Command から `yield* FirebaseService` で使う。開発は `demo-ryutama` プロジェクトの Emulator だけで行う。

**Tech Stack:** TypeScript 7, FoldKit 0.168 / Effect 4.0.0, Vite 8, Tailwind 4, Vitest 5, Oxlint / Oxfmt, firebase（JS SDK）, firebase-functions v2, firebase-admin, firebase-tools, @firebase/rules-unit-testing, concurrently, mise, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-10-20-scaffolding-design.md`

## Global Constraints

- ブランチは `feature/2-scaffolding`。コミットメッセージは日本語で、末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` を付ける
- `mise.toml`: `node = "24.22.0"`, `pnpm = "12.14.0"`, `java = "temurin-21"`。コマンドはすべて mise が有効なシェルで実行する
- Firebase プロジェクト ID は `demo-ryutama`。実プロジェクトには一切接続・デプロイしない
- Functions のリージョンは `asia-northeast1`、ランタイムは `nodejs24`（firebase-functions が未対応なら、対応している最新バージョンにして理由を `functions/package.json` の近くの README か commit メッセージに残す）
- Emulator のポート: Firestore 8080 / Functions 5001 / Hosting 5000 / UI 4000
- Firebase Authentication は導入しない
- Effect 系パッケージは雛形と同じ `4.0.0` に揃える。Effect 4 の API 名（例: `Schema.TaggedErrorClass`, `Schema.decodeUnknownEffect`, `Schema.Codec`）は `node_modules/effect` の型定義で確かめてから使う
- ファイル構成と命名は FoldKit の Project Organization に従い、空のファイルは作らない
- `tmp/` はコミットしない（`.gitignore` 済み）

## Review Focus

1. **Callable が想定外の形を返す**（Functions 側の変更や型ずれ）→ クラッシュせず `FirebaseCallError({ code: 'invalid-response' })` になる。Task 4 のテストで固定する
2. **Functions Emulator が起動していない / 落ちた** → `FirebaseCallError` になり、画面にエラーが出て、もう一度 Ping を押せる。Task 5 の Story で「失敗 → 再度 Ping → Loading」を固定する
3. **Ping の連打** → 実行中はボタンが disabled になり、update も `Loading` 中の `ClickedPing` を無視する（Command を出さない）。Task 5 の Story と Scene で固定する
4. **`VITE_USE_EMULATORS` が `'true'` 以外**（`'TRUE'`, `'1'`, `''`, 未定義）→ Emulator には接続しない。Task 3 のテストで固定する
5. **Web と Functions でリージョンがずれる** → `not-found` で Ping が失敗する。Task 6 で、Emulator の `asia-northeast1` の URL を curl で叩いて確かめる

---

### Task 1: ツールチェーンと workspace、Web 雛形

**Files:**
- Create: `mise.toml`, `package.json`, `pnpm-workspace.yaml`, `apps/web/**`（create-foldkit-app の出力）
- Move: `apps/web/.oxlintrc.json` → `.oxlintrc.json`, `apps/web/.oxfmtrc.json` → `.oxfmtrc.json`（雛形にない場合は作らない）
- Modify: `.gitignore`（`node_modules/`, `dist/`, `functions/lib/`, `.firebase/`, `*-debug.log` が無ければ追加）

**Interfaces:**
- Produces: workspace パッケージ名 `web`（`apps/web`）。ルートの `pnpm lint` / `pnpm format` / `pnpm typecheck` / `pnpm build` / `pnpm test`

- [ ] **Step 1: `mise.toml` を作り、ツールを揃える**

`mise.toml` の `[tools]` に Global Constraints の 3 つを書く。

Run: `mise install && node -v && pnpm -v && java -version`
Expected: `v24.22.0` / `12.14.0` / `openjdk version "21...`

- [ ] **Step 2: ルートの `package.json` と `pnpm-workspace.yaml` を作る**

- `package.json`: `"name": "ryutama-charsheet"`, `"private": true`, `"type": "module"`, `"packageManager": "pnpm@12.14.0"`
- `pnpm-workspace.yaml`: `packages: ['apps/*', 'functions']`

- [ ] **Step 3: Web 雛形を生成する**

Run（`apps/` の中で）: `pnpm dlx create-foldkit-app@0.39.1 --name web --rendering spa --example counter --package-manager pnpm`
Expected: `apps/web` に `src/main.ts`, `src/entry.ts`, `src/story.test.ts`, `src/scene.test.ts`, `vite.config.ts`, `vitest.config.ts`, `AGENTS.md`, `FOLDKIT.md` ができる

生成後の案内に出る `git init` と `git subtree add` は実行しない（既存リポジトリのため）。`apps/web` に `.git` や lockfile ができていたら削除し、ルートで `pnpm install` する。`apps/web/package.json` の `name` は `web`、`"private": true` にする。

- [ ] **Step 4: Oxlint / Oxfmt の設定をルートに移し、ルートのスクリプトを足す**

ルート `package.json` の `scripts`:

| script | 値 |
|---|---|
| `lint` | `oxlint apps/web/src functions/src tests` |
| `format` | `oxfmt` |
| `typecheck` | `pnpm -r typecheck` |
| `build` | `pnpm -r build` |
| `test` | `pnpm -r test` |

`oxlint` / `oxfmt` は `apps/web` からルートの devDependencies に移す（雛形の `lint` / `format` スクリプトは `apps/web` から削除）。`functions` と `tests` はまだ無いので、Oxlint が存在しないパスでエラーになる場合は、Task 2 / Task 7 で追加するまで外しておく。

- [ ] **Step 5: 雛形のままで全部通ることを確かめる**

Run: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`
Expected: すべて成功し、counter の story / scene テストが PASS

- [ ] **Step 6: Commit**

```bash
git add mise.toml package.json pnpm-workspace.yaml pnpm-lock.yaml .gitignore .oxlintrc.json .oxfmtrc.json apps/web
git commit -m "FoldKit の SPA 雛形と pnpm workspace を追加 (#2)"
```

---

### Task 2: Functions の `ping` と Firebase 設定

**Files:**
- Create: `functions/package.json`, `functions/tsconfig.json`, `functions/vitest.config.ts`, `functions/src/ping.ts`, `functions/src/ping.test.ts`, `functions/src/index.ts`
- Create: `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`
- Modify: ルート `package.json`（devDependency に `firebase-tools`）

**Interfaces:**
- Produces: `ping(now: Date): PingResponse`、`type PingResponse = { readonly message: 'pong'; readonly at: string }`（`functions/src/ping.ts`）
- Produces: callable 関数 `ping`（リージョン `asia-northeast1`）。Web からの応答は `{ message: string, at: string }`
- Produces: workspace パッケージ名 `functions`、スクリプト `build`（`tsc`、出力 `lib/`）, `typecheck`, `test`, `dev`（`tsc --watch`）

- [ ] **Step 1: `functions` パッケージを作る**

- `package.json`: `"name": "functions"`, `"private": true`, `"type": "module"`, `"main": "lib/index.js"`, `"engines": { "node": "24" }`
- dependencies: `firebase-functions`, `firebase-admin`（最新）。devDependencies: `typescript`（apps/web と同じバージョン）, `vitest`（apps/web と同じバージョン）
- `tsconfig.json`: `outDir: "lib"`, `rootDir: "src"`, `module`/`moduleResolution: "NodeNext"`, `strict: true`。`*.test.ts` はビルド対象から除外する

- [ ] **Step 2: 失敗するテストを書く（`functions/src/ping.test.ts`）**

```ts
import { describe, expect, test } from 'vitest'
import { ping } from './ping.js'

describe('ping', () => {
  test('returns pong with the given time as ISO 8601', () => {
    expect(ping(new Date('2026-10-20T12:34:56.000Z'))).toEqual({
      message: 'pong',
      at: '2026-10-20T12:34:56.000Z',
    })
  })
})
```

- [ ] **Step 3: テストが失敗することを確かめる**

Run: `pnpm --filter functions test`
Expected: FAIL（`./ping.js` が見つからない）

- [ ] **Step 4: `ping` と callable を実装する**

- `functions/src/ping.ts`: `ping(now: Date): PingResponse` を export する
- `functions/src/index.ts`: `firebase-functions/v2/https` の `onCall({ region: 'asia-northeast1' }, () => ping(new Date()))` を `ping` という名前で export する

- [ ] **Step 5: テストとビルドが通ることを確かめる**

Run: `pnpm --filter functions test && pnpm --filter functions build && ls functions/lib/index.js`
Expected: PASS、`functions/lib/index.js` が存在する

- [ ] **Step 6: Firebase の設定ファイルを作る**

- `.firebaserc`: `{ "projects": { "default": "demo-ryutama" } }`
- `firestore.rules`: `rules_version = '2';` で、`match /{document=**} { allow read, write: if false; }`
- `firestore.indexes.json`: `{ "indexes": [], "fieldOverrides": [] }`
- `firebase.json`:
  - `hosting`: `public: "apps/web/dist"`、SPA 用に全パスを `/index.html` に rewrite
  - `firestore`: `rules` / `indexes` に上の 2 ファイル
  - `functions`: `source: "functions"`, `runtime: "nodejs24"`, `predeploy: ["pnpm --filter functions build"]`
  - `emulators`: Global Constraints のポート、`ui.enabled: true`, `singleProjectMode: true`
- ルート devDependency に `firebase-tools` を追加する

- [ ] **Step 7: Emulator で `ping` が呼べることを確かめる**

Run: `pnpm exec firebase emulators:exec --only functions "curl -s -X POST -H 'Content-Type: application/json' -d '{\"data\":{}}' http://127.0.0.1:5001/demo-ryutama/asia-northeast1/ping"`
Expected: `{"result":{"message":"pong","at":"<ISO 時刻>"}}` が出力される。`nodejs24` が未対応というエラーが出たら、Global Constraints に従ってランタイムを下げる

- [ ] **Step 8: lint を functions にも広げて、全体を確かめる**

Run: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`
Expected: すべて成功

- [ ] **Step 9: Commit**

```bash
git add functions firebase.json .firebaserc firestore.rules firestore.indexes.json package.json pnpm-lock.yaml
git commit -m "Cloud Functions の ping と Firebase 設定を追加 (#2)"
```

---

### Task 3: Web の Firebase 設定（`config.ts`）

**Files:**
- Create: `apps/web/src/firebase/config.ts`, `apps/web/src/firebase/config.test.ts`, `apps/web/.env.development`
- Modify: `apps/web/src/vite-env.d.ts`（無ければ作る。`ImportMetaEnv` に下の変数を宣言）

**Interfaces:**
- Produces（`apps/web/src/firebase/config.ts`）:

```ts
export type FirebaseEnv = Readonly<Record<string, string | undefined>>
export type WebConfig = {
  readonly options: FirebaseOptions // 'firebase/app' の型
  readonly useEmulators: boolean
}
export const FUNCTIONS_REGION = 'asia-northeast1'
export const makeConfig = (env: FirebaseEnv): WebConfig
```

- 読む env: `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_USE_EMULATORS`

- [ ] **Step 1: `apps/web` に `firebase` を追加する**

Run: `pnpm --filter web add firebase`

- [ ] **Step 2: 失敗するテストを書く（`config.test.ts`）**

```ts
describe('makeConfig', () => {
  test('falls back to demo-ryutama when no env is given', () => {
    const config = makeConfig({})
    expect(config.options.projectId).toBe('demo-ryutama')
    expect(config.useEmulators).toBe(false)
  })

  test('uses the given project settings', () => {
    const config = makeConfig({
      VITE_FIREBASE_PROJECT_ID: 'ryutama-prod',
      VITE_FIREBASE_API_KEY: 'key',
      VITE_FIREBASE_APP_ID: 'app',
    })
    expect(config.options).toMatchObject({
      projectId: 'ryutama-prod',
      apiKey: 'key',
      appId: 'app',
    })
  })

  test('connects to the emulators only when VITE_USE_EMULATORS is exactly "true"', () => {
    expect(makeConfig({ VITE_USE_EMULATORS: 'true' }).useEmulators).toBe(true)
    for (const value of ['TRUE', '1', '', 'false', undefined]) {
      expect(makeConfig({ VITE_USE_EMULATORS: value }).useEmulators).toBe(false)
    }
  })
})
```

- [ ] **Step 3: テストが失敗することを確かめる**

Run: `pnpm --filter web test -- src/firebase/config.test.ts`
Expected: FAIL（`makeConfig` が無い）

- [ ] **Step 4: `makeConfig` を実装する**

未設定の項目は `options` に含めない（`undefined` のキーを作らない）。

- [ ] **Step 5: `.env.development` を作る**

中身は `VITE_USE_EMULATORS=true` の 1 行だけ。

- [ ] **Step 6: テストが通ることを確かめる**

Run: `pnpm --filter web test && pnpm --filter web typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "Web の Firebase 設定を env から組み立てる (#2)"
```

---

### Task 4: `FirebaseService`（Resource）

**Files:**
- Create: `apps/web/src/firebase/service.ts`, `apps/web/src/firebase/service.test.ts`

**Interfaces:**
- Consumes: `makeConfig`, `FUNCTIONS_REGION`（Task 3）
- Produces（`apps/web/src/firebase/service.ts`）:

```ts
export class FirebaseCallError /* Schema.TaggedErrorClass, tag 'FirebaseCallError' */ {
  readonly code: string
  readonly message: string
}
export type Callable = (name: string) => (data: unknown) => Promise<{ readonly data: unknown }>
export const makeCall: (callable: Callable) =>
  <A, I>(name: string, data: unknown, response: Schema.Codec<A, I>) => Effect.Effect<A, FirebaseCallError>
export class FirebaseService /* Context.Service, key 'FirebaseService' */ {
  readonly firestore: Firestore
  readonly call: ReturnType<typeof makeCall>
  static readonly Default: Layer.Layer<FirebaseService>
}
```

- [ ] **Step 1: 失敗するテストを書く（`service.test.ts`）**

`makeCall` に偽の `Callable` を渡して確かめる。Firebase SDK には触らない。

```ts
const Pong = Schema.Struct({ message: Schema.String, at: Schema.String })
const resolving = (data: unknown): Callable => () => () => Promise.resolve({ data })
const rejecting = (error: unknown): Callable => () => () => Promise.reject(error)

test('decodes a successful response', async () => {
  const result = await Effect.runPromise(
    makeCall(resolving({ message: 'pong', at: 't' }))('ping', {}, Pong),
  )
  expect(result).toEqual({ message: 'pong', at: 't' })
})

test('fails with invalid-response when the response does not match the schema', async () => {
  const error = await Effect.runPromise(
    Effect.flip(makeCall(resolving({ message: 1 }))('ping', {}, Pong)),
  )
  expect(error._tag).toBe('FirebaseCallError')
  expect(error.code).toBe('invalid-response')
})

test('keeps the code and message of a Firebase error', async () => {
  const error = await Effect.runPromise(
    Effect.flip(
      makeCall(rejecting({ code: 'functions/unavailable', message: 'down' }))('ping', {}, Pong),
    ),
  )
  expect(error).toMatchObject({ code: 'functions/unavailable', message: 'down' })
})

test('uses unknown for errors without a code', async () => {
  const error = await Effect.runPromise(
    Effect.flip(makeCall(rejecting(new Error('boom')))('ping', {}, Pong)),
  )
  expect(error).toMatchObject({ code: 'unknown', message: 'boom' })
})

test('passes the function name and data to the callable', async () => {
  const calls: Array<[string, unknown]> = []
  const callable: Callable = name => data => {
    calls.push([name, data])
    return Promise.resolve({ data: { message: 'pong', at: 't' } })
  }
  await Effect.runPromise(makeCall(callable)('ping', { a: 1 }, Pong))
  expect(calls).toEqual([['ping', { a: 1 }]])
})
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `pnpm --filter web test -- src/firebase/service.test.ts`
Expected: FAIL（`makeCall` が無い）

- [ ] **Step 3: `FirebaseCallError` と `makeCall` を実装する**

Promise は `Effect.tryPromise` で包む。reject された値の `code` / `message` が文字列ならそのまま使い、なければ `code: 'unknown'`（message は `Error` なら `error.message`、それ以外は `String(error)`）。Schema の検証に失敗したら `code: 'invalid-response'` で、message は Schema のエラー文。

- [ ] **Step 4: `FirebaseService.Default` を実装する**

`Layer.effect` の中で `makeConfig(import.meta.env)` → `initializeApp(options)` → `getFirestore(app)` / `getFunctions(app, FUNCTIONS_REGION)`。`useEmulators` のときだけ `connectFirestoreEmulator(firestore, '127.0.0.1', 8080)` と `connectFunctionsEmulator(functions, '127.0.0.1', 5001)`。`call` は `makeCall(name => httpsCallable(functions, name))`。

- [ ] **Step 5: テストと型が通ることを確かめる**

Run: `pnpm --filter web test && pnpm --filter web typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "Firebase SDK を FoldKit の Resource として包む (#2)"
```

---

### Task 5: Ping 画面

counter の雛形を、spec の Ping 画面に置き換える。

**Files:**
- Create: `apps/web/src/model.ts`, `apps/web/src/message.ts`, `apps/web/src/command.ts`, `apps/web/src/update.ts`, `apps/web/src/view.ts`
- Modify: `apps/web/src/main.ts`（`init` だけを持つ）, `apps/web/src/entry.ts`（`resources: FirebaseService.Default` を渡す）
- Modify: `apps/web/src/story.test.ts`, `apps/web/src/scene.test.ts`（counter のテストを置き換える）

**Interfaces:**
- Consumes: `FirebaseService`, `FirebaseCallError`（Task 4）
- Produces:
  - `model.ts`: `Ping` = `PingIdle {}` | `PingLoading {}` | `PingSuccess { message: string, at: string }` | `PingFailure { code: string, message: string }`（tagged struct の Union）、`Model = Schema.Struct({ ping: Ping })`。テストで `PingIdle()` / `PingLoading()` / `PingSuccess({ message, at })` / `PingFailure({ code, message })` と書けるコンストラクタも同じ名前で export する
  - `message.ts`: `Message = defineMessageUnion({ ClickedPing: {}, SucceededPing: { message: Schema.String, at: Schema.String }, FailedPing: { code: Schema.String, message: Schema.String } })`
  - `command.ts`: `CallPing = Command.define('CallPing', { messages: [Message.SucceededPing, Message.FailedPing], execute: ... })`。引数なし。`FirebaseService.call('ping', {}, PingResponse)` の結果を `SucceededPing` に、`FirebaseCallError` を `FailedPing` にする
  - `update.ts`: `update(model: Model, message: Message): Update.Return<Model, Message>`
  - `view.ts`: `view(model: Model, h: HtmlBuilder<Message>): Document`
  - `main.ts`: `init` は `{ model: { ping: PingIdle } }`、Command なし

**画面の文言（このとおりに作る）:**
- タイトル: `りゅうたま キャラクターシート`
- ボタン: 通常は `Ping`。`PingLoading` のときは `送信中…` と表示し disabled
- `PingSuccess`: `${message} (${at})`
- `PingFailure`: `エラー: ${code} ${message}`
- `PingIdle`: 結果欄は表示しない

- [ ] **Step 1: 失敗する Story テストを書く（`story.test.ts`）**

```ts
const idle: Model = { ping: PingIdle() }

test('ClickedPing starts loading and calls ping', () => {
  story(update, given(idle),
    message(Message.ClickedPing()),
    Command.expectExact(CallPing),
    model(m => { expect(m.ping._tag).toBe('PingLoading') }),
  )
})

test('SucceededPing shows the response', () => {
  story(update, given(idle),
    message(Message.ClickedPing()),
    Command.resolve(CallPing, Message.SucceededPing({ message: 'pong', at: '2026-10-20T00:00:00.000Z' })),
    model(m => { expect(m.ping).toEqual(PingSuccess({ message: 'pong', at: '2026-10-20T00:00:00.000Z' })) }),
  )
})

test('FailedPing keeps the error and allows another ping', () => {
  story(update, given(idle),
    message(Message.ClickedPing()),
    Command.resolve(CallPing, Message.FailedPing({ code: 'functions/unavailable', message: 'down' })),
    model(m => { expect(m.ping).toEqual(PingFailure({ code: 'functions/unavailable', message: 'down' })) }),
    message(Message.ClickedPing()),
    Command.expectExact(CallPing),
    model(m => { expect(m.ping._tag).toBe('PingLoading') }),
  )
})

test('ClickedPing while loading is ignored', () => {
  story(update, given({ ping: PingLoading() }),
    message(Message.ClickedPing()),
    Command.expectNone(),
    model(m => { expect(m.ping._tag).toBe('PingLoading') }),
  )
})
```

- [ ] **Step 2: 失敗する Scene テストを書く（`scene.test.ts`）**

```ts
test('idle shows an enabled Ping button and no result', () => {
  scene({ update, view }, given({ ping: PingIdle() }),
    expect(role('button', { name: 'Ping' })).toExist(),
    expect(text('エラー:', { exact: false })).not.toExist(),
  )
})

test('clicking Ping shows the loading state, then the result', () => {
  scene({ update, view }, given({ ping: PingIdle() }),
    click(role('button', { name: 'Ping' })),
    expect(role('button', { name: '送信中…' })).toBeDisabled(),
    Command.resolve(CallPing, Message.SucceededPing({ message: 'pong', at: '2026-10-20T00:00:00.000Z' })),
    expect(text('pong (2026-10-20T00:00:00.000Z)')).toExist(),
  )
})

test('failure shows the code and message', () => {
  scene({ update, view }, given({ ping: PingFailure({ code: 'functions/unavailable', message: 'down' }) }),
    expect(text('エラー: functions/unavailable down')).toExist(),
    expect(role('button', { name: 'Ping' })).toExist(),
  )
})
```

`text(..., { exact: false })`、`.not`、`.toBeDisabled()` が foldkit/scene に無い場合は、型定義（`node_modules/foldkit` の scene）にある同じ意味のマッチャを使う。

- [ ] **Step 3: テストが失敗することを確かめる**

Run: `pnpm --filter web test`
Expected: FAIL（`model.ts` などが無い）

- [ ] **Step 4: model / message / command / update / view / main / entry を実装する**

- ボタンは counter と同じく `@foldkit/ui` の `Button.view` を使い、`PingLoading` のときは `disabled` 属性を付ける
- `entry.ts` は counter の `Runtime.makeApplication` に `resources: FirebaseService.Default` を足す
- counter 用のコード（`ClickedIncrement` など）は残さない

- [ ] **Step 5: テストと型、lint が通ることを確かめる**

Run: `pnpm --filter web test && pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "Functions の疎通を確かめる Ping 画面を追加 (#2)"
```

---

### Task 6: 開発コマンド（`pnpm dev` / `pnpm emulators`）と通しの確認

**Files:**
- Modify: ルート `package.json`（devDependency に `concurrently`、スクリプト追加）, `apps/web/package.json`, `functions/package.json`

**Interfaces:**
- Consumes: `functions` の `build` / `dev`、`web` の `dev` / `build`

- [ ] **Step 1: スクリプトを追加する**

| script | 値 |
|---|---|
| `dev` | `pnpm --filter functions build && concurrently -k -n functions,emulators,web "pnpm --filter functions dev" "firebase emulators:start --only firestore,functions" "pnpm --filter web dev"` |
| `emulators` | `pnpm build && firebase emulators:start` |
| `deploy` | `firebase deploy` |

- [ ] **Step 2: `pnpm dev` で通しの動作を確かめる**

Run: `pnpm dev`（バックグラウンドで起動する）。続けて `curl -s -X POST -H 'Content-Type: application/json' -d '{"data":{}}' http://127.0.0.1:5001/demo-ryutama/asia-northeast1/ping`
Expected: `{"result":{"message":"pong",...}}`。Vite の dev server（既定 http://localhost:5173 ）が 200 を返す

ブラウザで開いて Ping を押し、`pong (<時刻>)` が表示されることを確かめる。ブラウザ操作ができない環境なら、ユーザーに確認を頼む。確認できたら `pnpm dev` を止める。

- [ ] **Step 3: Emulator を止めた状態でエラー表示を確かめる**

Vite だけ起動し（`pnpm --filter web dev`）、Ping を押すと `エラー: functions/...` が表示され、ボタンをもう一度押せることを確かめる。

- [ ] **Step 4: Commit**

```bash
git add package.json apps/web/package.json functions/package.json pnpm-lock.yaml
git commit -m "Emulator と Vite をまとめて起動する開発スクリプトを追加 (#2)"
```

---

### Task 7: Firestore ルールのテスト（`pnpm test:emulator`）

**Files:**
- Create: `tests/firestore.rules.test.ts`, `vitest.config.ts`（ルート。`include: ['tests/**/*.test.ts']`, `environment: 'node'`）
- Modify: ルート `package.json`（devDependency に `@firebase/rules-unit-testing`, `firebase`, `vitest`、スクリプト追加）, `pnpm-workspace.yaml` は変更しない

**Interfaces:**
- Produces: ルートの `test:emulator` スクリプト = `firebase emulators:exec --only firestore "vitest run"`

- [ ] **Step 1: テストを書く**

```ts
let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ryutama',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(() => env.cleanup())

test('anyone is denied reading a character', async () => {
  const db = env.unauthenticatedContext().firestore()
  await assertFails(getDoc(doc(db, 'characters/x')))
})

test('anyone is denied writing a character', async () => {
  const db = env.unauthenticatedContext().firestore()
  await assertFails(setDoc(doc(db, 'characters/x'), { name: 'test' }))
})
```

- [ ] **Step 2: ルールを一時的に `allow read, write: if true;` にしてテストが失敗することを確かめ、元に戻す**

Run: `pnpm test:emulator`
Expected: 一時的に変えた状態では FAIL、元に戻すと PASS

- [ ] **Step 3: lint の対象に `tests` を入れて全体を確かめる**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:emulator`
Expected: すべて成功

ルートの `pnpm test`（`pnpm -r test`）がルートの `vitest.config.ts` を拾って Emulator 無しで `tests/` を実行してしまう場合は、`pnpm -r --filter './apps/*' --filter functions test` に変える。

- [ ] **Step 4: Commit**

```bash
git add tests vitest.config.ts package.json pnpm-lock.yaml
git commit -m "Firestore ルールのテストを Emulator で実行する (#2)"
```

---

### Task 8: CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: workflow を書く**

- `on`: `push`（branches: `main`）と `pull_request`
- `jobs.ci`（`ubuntu-latest`）の steps: `actions/checkout@v5` → `jdx/mise-action@v3` → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm build` → `pnpm test` → `pnpm test:emulator`
- action のバージョンは、実装時点の最新メジャーを確かめて固定する

- [ ] **Step 2: actionlint で検証する**

Run: `actionlint .github/workflows/ci.yml`
Expected: 何も出力されず終了コード 0

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "GitHub Actions の CI を追加 (#2)"
```

- [ ] **Step 4: push と PR 作成について、ユーザーに確認する**

push と PR 作成は外部に公開する操作なので、ユーザーの了承を得てから行う。了承されたら `git push -u origin feature/2-scaffolding` → `gh pr create`（本文の末尾に `Closes #2` と `🤖 Generated with [Claude Code](https://claude.com/claude-code)`）→ CI が成功することを確かめる。

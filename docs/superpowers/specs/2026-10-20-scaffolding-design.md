# スキャフォールディング設計（Issue #2）

- 関連 Issue: #1（キャラクターシート管理サイト）、#2（スキャフォールディング）、#3（サイトの大まかな条件）
- 日付: 2026-10-20

## 目的とスコープ

りゅうたまのキャラクターシート管理サイト（#1）を作り始めるための土台を用意する。
技術スタックは #2 の指定どおり TypeScript / Firebase / FoldKit。

### スコープに含めるもの

- FoldKit（SPA モード）の Web アプリの雛形
- Firebase Hosting / Firestore / Cloud Functions の設定と Emulator での開発環境
- Web → Cloud Functions の疎通を確認する最小限の画面（Ping）
- lint / format / typecheck / build / test の仕組みと GitHub Actions の CI

### スコープに含めないもの

- Firebase Authentication（#3 によりユーザー認証は用意しない）
- キャラクターの一覧・作成・編集・複製などの機能（後続 Issue）
- パスワード照合の実装（後続 Issue。ただし Cloud Functions で照合する方式を前提とする）
- 実 Firebase プロジェクトの作成とデプロイ workflow（後続 Issue）

### 前提となる決定

- **描画方式:** SPA。ログインなしでも中身はクライアントから Firestore / Functions を叩く画面が中心で、SSG / SSR の利点が小さいため
- **Firebase プロジェクト:** 未作成。`demo-ryutama`（`demo-` 接頭辞の Emulator 専用プロジェクト）で開発する
- **パスワード方式:** #3 の「パスワードを知っている人は編集・複製できる」は、Cloud Functions でパスワードのハッシュを照合してから書き込む方式を前提とする。ハッシュはクライアントから読めない場所に置く。本番では Blaze プランが必要になる
- **パッケージマネージャ / ランタイム:** pnpm + Node 24。mise で固定する

## ① リポジトリ構成

pnpm workspace で Web アプリと Functions を分ける。

```
ryutama-charsheet/
├─ mise.toml                 # node / pnpm / java を固定
├─ package.json              # workspace ルート。開発用スクリプトを集約
├─ pnpm-workspace.yaml       # apps/web, functions
├─ firebase.json             # hosting(apps/web/dist), firestore, functions, emulators
├─ .firebaserc               # default: demo-ryutama
├─ firestore.rules           # 全拒否
├─ firestore.indexes.json
├─ tests/
│  └─ firestore.rules.test.ts
├─ .github/workflows/ci.yml
├─ apps/web/                 # create-foldkit-app（SPA, pnpm）の出力を配置
│  └─ src/
│     ├─ entry.ts            # Runtime.makeApplication({ resources: FirebaseService.Default })
│     ├─ main.ts / model.ts / message.ts / command.ts / update.ts / view.ts
│     ├─ story.test.ts / scene.test.ts
│     └─ firebase/
│        ├─ config.ts        # env から設定を読む
│        ├─ config.test.ts
│        └─ service.ts       # FirebaseService（Resource）
└─ functions/                # TypeScript の Cloud Functions（v2）
   └─ src/
      ├─ index.ts            # callable `ping` を export
      ├─ ping.ts             # 純粋関数のハンドラ
      └─ ping.test.ts
```

- ファイル構成と命名は FoldKit の Project Organization（https://foldkit.dev/patterns/project-organization ）に従う。必要になるまで空のファイルは作らない
- `create-foldkit-app` が生成した `AGENTS.md` / `FOLDKIT.md` はそのまま残す
- 実プロジェクトを作るときは `.firebaserc` を差し替えるだけで済むようにする

## ② Firebase 連携

### 設定（`apps/web/src/firebase/config.ts`）

- Vite の env から `VITE_FIREBASE_PROJECT_ID`、`VITE_FIREBASE_API_KEY`、`VITE_FIREBASE_APP_ID` などを読む
- 何も設定がなければ `projectId: 'demo-ryutama'` を使い、Emulator だけで動くようにする
- `VITE_USE_EMULATORS` が `'true'` のときだけ Emulator に接続する。`apps/web/.env.development` で `true`、本番ビルドでは未設定（false）とする
- 設定を組み立てる処理は、env オブジェクトを受け取る純粋関数にする（テストしやすくするため）

### Emulator のポート

Firebase の既定値を使う。

| Emulator | ポート |
|---|---|
| Firestore | 8080 |
| Functions | 5001 |
| Hosting | 5000 |
| Emulator UI | 4000 |

### FirebaseService（`apps/web/src/firebase/service.ts`）

FoldKit の Resource（https://foldkit.dev/core/resources ）として定義し、`entry.ts` で `Runtime.makeApplication` の `resources` に渡す。

```ts
class FirebaseService extends Context.Service<
  FirebaseService,
  {
    readonly firestore: Firestore
    readonly call: <A, I>(
      name: string,
      data: unknown,
      response: Schema.Schema<A, I>,
    ) => Effect.Effect<A, FirebaseCallError>
  }
>()('FirebaseService') {
  static readonly Default = Layer.effect(this, make)
}
```

- `make` の中で、`initializeApp` と（必要なら）Emulator への接続を 1 回だけ行う
- Functions のリージョンは `asia-northeast1`
- **`call`:** `httpsCallable` を Effect で包み、戻り値を Schema で検証する。呼び出しや検証に失敗したら `FirebaseCallError` にする
- **`FirebaseCallError`:** `Schema.TaggedError`。`code` と `message` を持つ
- **`firestore`:** インスタンスをそのまま公開する。読み込み用の Effect ラッパーは、キャラクター一覧の Issue で必要な形が決まってから作る

### 疎通確認の画面

- トップページに「Ping」ボタンと結果の表示欄を置く
- Model の `ping` は次の 4 状態をとる
  - `Idle`（未実行）
  - `Loading`（実行中）
  - `Success`（`message` と `at` を持つ）
  - `Failure`（`error` を持つ）
- ボタンを押すと `ClickedPing` Message が来る。update は `Loading` にして `CallPing` Command を返す
- `CallPing` は `FirebaseService.call('ping', {}, PingResponse)` を実行し、結果に応じて `SucceededPing` か `FailedPing` を返す
- `PingResponse` は `Schema.Struct({ message: Schema.String, at: Schema.String })`

### Functions（`functions/`）

- firebase-functions v2 の `onCall` で `ping` を定義する。リージョンは `asia-northeast1`
- ハンドラ本体は `ping.ts` に純粋関数として切り出す。現在時刻を引数で受け取り、`{ message: 'pong', at: <ISO 8601 文字列> }` を返す
- ランタイムは `nodejs24`（`mise.toml` の Node と合わせる）。実装時に firebase-functions が nodejs24 に未対応なら、対応している最新のバージョンにして、その理由を残す

### Firestore ルール

- `firestore.rules` はすべての読み書きを拒否する。パスワード方式を入れる Issue で緩める

### エラー処理

- `FirebaseService` の Layer の構築に失敗したら、FoldKit の crash view で表示する
- `call` の失敗は `FirebaseCallError` として Message に渡し、Ping の結果欄に `code` と `message` を表示する

## ③ 開発コマンドと CI

### `mise.toml`

```toml
[tools]
node = "24.22.0"
pnpm = "12.14.0"
java = "temurin-21"
```

Java は Firestore Emulator を動かすために必要。

### ルート `package.json` のスクリプト

| コマンド | 内容 |
|---|---|
| `pnpm dev` | 次の 3 つを `concurrently` で同時に起動する: functions の `tsc --watch`、Firebase Emulator（Firestore、Functions）、apps/web の Vite dev server |
| `pnpm emulators` | Hosting も含めて Emulator を起動する。ビルド済みの `dist` を確かめる用 |
| `pnpm build` | apps/web の `vite build` と functions の `tsc` |
| `pnpm typecheck` | 全ワークスペースで `tsc --noEmit` |
| `pnpm lint` | Oxlint |
| `pnpm format` | Oxfmt |
| `pnpm test` | Emulator が要らない Vitest（apps/web、functions） |
| `pnpm test:emulator` | `firebase emulators:exec --only firestore "vitest run tests/"` |
| `pnpm deploy` | `firebase deploy`。実プロジェクトを作るまでは使わない |

- `firebase-tools` と `concurrently` はルートの devDependency にする。グローバルにインストールしなくて済むようにするため
- Oxlint / Oxfmt の設定は、FoldKit の雛形の `.oxlintrc.json` / `.oxfmtrc.json` をルートに移して全体で共有する

### CI（`.github/workflows/ci.yml`）

- **トリガー:** `main` への push と pull request
- **手順:**
  1. checkout
  2. `jdx/mise-action` で `mise.toml` のツールを揃える
  3. `pnpm install --frozen-lockfile`
  4. `pnpm lint`
  5. `pnpm typecheck`
  6. `pnpm build`
  7. `pnpm test`
  8. `pnpm test:emulator`
- workflow ファイルはコミット前に `actionlint` で検証する
- デプロイ用の workflow は後続 Issue で作る

## ④ テスト

テストランナーは Vitest。

| 対象 | ファイル | 内容 | Emulator |
|---|---|---|---|
| Web update | `apps/web/src/story.test.ts` | FoldKit の `Story` で Ping の状態遷移（Idle → Loading → Success / Failure）を確かめる。`CallPing` の結果は Story の中で差し替える | 不要 |
| Web view | `apps/web/src/scene.test.ts` | FoldKit の `Scene` で 4 状態それぞれの表示を確かめる | 不要 |
| Web config | `apps/web/src/firebase/config.test.ts` | env がないと `demo-ryutama` を使うこと、`VITE_USE_EMULATORS` の切り替えが効くことを確かめる | 不要 |
| Functions | `functions/src/ping.test.ts` | ハンドラが `{ message: 'pong', at }` を返すことを確かめる | 不要 |
| Firestore ルール | `tests/firestore.rules.test.ts` | `@firebase/rules-unit-testing` で `characters/x` の読み書きがどちらも拒否されることを確かめる | 必要 |

## 完了の条件

1. `mise install && pnpm install && pnpm dev` を実行し、ブラウザで Ping を押すと pong と時刻が表示される
2. `pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test`、`pnpm test:emulator` がすべて成功する
3. PR の CI がすべて成功する

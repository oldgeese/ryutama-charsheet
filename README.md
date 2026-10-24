# ryutama-charsheet

りゅうたまのキャラクターシートを作って共有するサイト。

## 開発

```sh
pnpm install
pnpm dev   # Emulator（demo-ryutama）と Vite を起動する
```

## 環境とデプロイ

| 環境 | Firebase プロジェクト | URL | デプロイのきっかけ |
|---|---|---|---|
| 開発 | `ryutama-charsheet-dev` | https://ryutama-charsheet-dev.web.app | `main` に push したとき |
| 本番 | `ryutama-charsheet` | https://ryutama-charsheet.web.app | GitHub で Release を公開したとき |

- デプロイは `.github/workflows/ci.yml` の `deploy` ジョブが行う。テストが通ってから動く
- 本番に出すときは、`v` で始まるタグ（例: `v1.0.0`）で Release を公開する。GitHub の Environment `prod` は `v*` のタグからしかデプロイできない
- GitHub Actions は Workload Identity Federation で GCP に入る。鍵ファイルはない
  - 識別子と Web の Firebase 設定は、Environment（`dev`、`prod`）の Variables に置いてある
  - プロジェクトを作り直したときは `scripts/setup-deploy-iam.sh <プロジェクト ID> <Environment 名>` を実行し、出力を Variables に登録する
- 2 つのプロジェクト合わせて月 ¥500 の予算アラートを付けている

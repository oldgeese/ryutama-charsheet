import { Option, String } from 'effect'

// NOTE: CI はリリース以外のデプロイでも空文字を渡すので、空文字は値なしとみなす
const presentVersion = (version: string | undefined): Option.Option<string> =>
  Option.fromNullishOr(version).pipe(Option.filter(String.isNonEmpty))

export const resolveAppVersion = (
  releaseTag: string | undefined,
  commitHash: () => string,
): string => Option.getOrElse(presentVersion(releaseTag), commitHash)

export const versionLabel = (
  version: string | undefined,
): Option.Option<string> =>
  Option.map(presentVersion(version), version => `バージョン ${version}`)

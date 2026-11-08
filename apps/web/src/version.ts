import { Option, String } from 'effect'

// NOTE: CI はリリース以外のデプロイでも空文字を渡すので、空文字はタグなしとみなす
export const resolveAppVersion = (
  releaseTag: string | undefined,
  commitHash: () => string,
): string =>
  releaseTag === undefined || String.isEmpty(releaseTag)
    ? commitHash()
    : releaseTag

export const versionLabel = (
  version: string | undefined,
): Option.Option<string> =>
  Option.fromNullishOr(version).pipe(
    Option.filter(String.isNonEmpty),
    Option.map(version => `バージョン ${version}`),
  )

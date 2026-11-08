import { Option } from 'effect'
import { describe, expect, test } from 'vitest'

import { resolveAppVersion, versionLabel } from './version'

describe('resolveAppVersion', () => {
  test('uses the release tag when one is given', () => {
    expect(resolveAppVersion('v1.0.0', () => 'a1b2c3d')).toBe('v1.0.0')
  })

  test('falls back to the commit hash without a release tag', () => {
    for (const releaseTag of ['', undefined]) {
      expect(resolveAppVersion(releaseTag, () => 'a1b2c3d')).toBe('a1b2c3d')
    }
  })
})

describe('versionLabel', () => {
  test('prefixes the version', () => {
    expect(versionLabel('v1.0.0')).toStrictEqual(
      Option.some('バージョン v1.0.0'),
    )
  })

  test('is empty without a version', () => {
    for (const version of ['', undefined]) {
      expect(versionLabel(version)).toStrictEqual(Option.none())
    }
  })
})

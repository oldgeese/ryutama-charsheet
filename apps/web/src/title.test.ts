import { describe, expect, test } from 'vitest'

import { siteTitle } from './title'

describe('siteTitle', () => {
  test('marks the development site', () => {
    expect(
      siteTitle({ VITE_FIREBASE_PROJECT_ID: 'ryutama-charsheet-dev' }),
    ).toBe('りゅうたま キャラクターシート（開発用）')
  })

  test('leaves other sites unmarked', () => {
    for (const projectId of ['ryutama-charsheet', undefined]) {
      expect(siteTitle({ VITE_FIREBASE_PROJECT_ID: projectId })).toBe(
        'りゅうたま キャラクターシート',
      )
    }
  })
})
